import { useEffect, useRef } from 'react'
import { scrollRef, useStore } from '@/store/useStore'
import { chapters, clamp01 } from '@/timeline/chapters'
import { film, stillFor } from '@/data/cinematicPlates'

/**
 * The film, scrubbed frame by frame against the scroll.
 *
 * A <video> cannot be driven by a wheel: seeking is asynchronous, lands on the
 * nearest keyframe and stalls the main thread, so scrolling gave loose motion
 * that carried on after you stopped. Every chapter's clip is therefore stored
 * as a strip of stills, and scroll position picks one and draws it to a single
 * 2D canvas. One frame per scroll position, exactly, and one composited layer
 * for the whole film instead of one per chapter.
 *
 * Decoded frames are uncompressed: a 1920x1080 bitmap is 8.3 MB, so a 40-frame
 * strip costs about 330 MB. Nothing may hold more than a few strips at once,
 * which is what the eviction window below is for.
 */

interface FrameManifest {
  proxyEvery: number
  desktop: { dir: string; w: number; h: number; clips: Record<string, number> }
  mobile: { dir: string; w: number; h: number; clips: Record<string, number> }
}

/**
 * Every strip in scroll order, with the slice of the timeline it owns. A
 * chapter with two strips cuts from one to the next halfway through its band.
 */
const FILM = film.flatMap((f) => {
  const c = chapters.find((x) => x.id === f.chapter)!
  const n = f.clips.length
  return f.clips.map((clip, i) => ({
    clip: clip.id,
    still: stillFor(clip.id),
    index: c.index,
    start: c.start + ((c.end - c.start) * i) / n,
    end: c.start + ((c.end - c.start) * (i + 1)) / n,
  }))
})

type Strip = { count: number; bmp: (ImageBitmap | null)[]; q: Uint8Array }

const AVIF_PROBE =
  'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A='

const probeAvif = () =>
  new Promise<boolean>((res) => {
    const i = new Image()
    i.onload = () => res(true)
    i.onerror = () => res(false)
    i.src = AVIF_PROBE
  })

export function FilmStrip() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const gradeRef = useRef<HTMLDivElement>(null)
  const reduced = useStore((s) => s.reducedMotion)

  useEffect(() => {
    const cv = canvas.current
    const grade = gradeRef.current
    if (!cv || !grade) return
    const ctx = cv.getContext('2d', { alpha: false })
    if (!ctx) return

    let alive = true
    let manifest: FrameManifest | null = null
    let avif = false
    let isMobile = window.matchMedia('(max-width: 767px)').matches
    const strips: Record<string, Strip> = {}
    const queue: { clip: string; i: number; url: string; q: number }[] = []
    let inflight = 0
    const state = { clip: '', frame: 0, dirty: true }
    let lastVis = -1
    const posters: Record<string, HTMLImageElement> = {}

    const profile = () => (isMobile ? manifest!.mobile : manifest!.desktop)

    // the small webp loads first and stands in until the avif arrives; without
    // avif it is the strip, soft but still one frame per scroll position
    const url = (clip: string, i: number, small: boolean) => {
      const p = profile()
      const n = String(i + 1).padStart(4, '0')
      return small || !avif ? `${p.dir}/${clip}/${n}.webp` : `${p.dir}/${clip}/${n}.avif`
    }

    function pump() {
      while (alive && inflight < 6 && queue.length) {
        const job = queue.shift()!
        inflight++
        fetch(job.url)
          .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
          .then((b) => createImageBitmap(b))
          .then((bmp) => {
            const s = strips[job.clip]
            if (!s || !alive) return bmp.close?.()
            if (job.q >= s.q[job.i]) {
              s.bmp[job.i]?.close?.()
              s.bmp[job.i] = bmp
              s.q[job.i] = job.q
              if (job.clip === state.clip) state.dirty = true
            } else bmp.close?.()
          })
          .catch(() => {})
          .finally(() => {
            inflight--
            pump()
          })
      }
    }

    const enqueue = (clip: string, i: number, proxy: boolean) => {
      const s = strips[clip]
      const q = proxy ? 1 : 2
      if (!s || s.q[i] >= q) return
      queue.push({ clip, i, url: url(clip, i, proxy), q })
    }

    function loadStrip(clip: string) {
      if (strips[clip] || !manifest) return
      const count = profile().clips[clip]
      if (!count) return
      strips[clip] = { count, bmp: new Array(count).fill(null), q: new Uint8Array(count) }
      // the small strip first, so scrubbing works before the full one lands
      for (let i = 0; i < count; i++) enqueue(clip, i, true)
      if (!avif) return pump()
      let start = 0
      const batch = () => {
        if (!alive || !strips[clip]) return
        const end = Math.min(start + 24, count)
        for (let i = start; i < end; i++) enqueue(clip, i, false)
        start = end
        pump()
        if (start < count) setTimeout(batch, 260)
      }
      batch()
      pump()
    }

    function release(clip: string) {
      const s = strips[clip]
      if (!s) return
      s.bmp.forEach((b) => b?.close?.())
      delete strips[clip]
    }

    /** keep the current strip and one either side; hand the rest back */
    function evict(clip: string) {
      const i = FILM.findIndex((f) => f.clip === clip)
      if (i < 0) return
      const keep = new Set([clip])
      if (FILM[i - 1]) keep.add(FILM[i - 1].clip)
      if (FILM[i + 1]) keep.add(FILM[i + 1].clip)
      for (const k of Object.keys(strips)) if (!keep.has(k)) release(k)
      for (let n = queue.length - 1; n >= 0; n--) if (!strips[queue[n].clip]) queue.splice(n, 1)
    }

    const nearest = (clip: string, i: number) => {
      const s = strips[clip]
      if (!s) return null
      if (s.bmp[i]) return s.bmp[i]
      for (let d = 1; d < s.count; d++) {
        if (s.bmp[i - d]) return s.bmp[i - d]
        if (s.bmp[i + d]) return s.bmp[i + d]
      }
      return null
    }

    function resize() {
      // The frames are 1920 wide. Giving the canvas a retina backing store just
      // upscales them into a buffer four times the area, which costs a large
      // draw and a large composite every frame and shows nothing extra.
      const p = manifest ? profile() : { w: 1920 }
      const dpr = Math.min(window.devicePixelRatio || 1, p.w / window.innerWidth, 1.5)
      cv!.width = Math.round(window.innerWidth * Math.max(1, dpr))
      cv!.height = Math.round(window.innerHeight * Math.max(1, dpr))
      isMobile = window.matchMedia('(max-width: 767px)').matches
      state.dirty = true
    }

    function drawCover(src: CanvasImageSource, sw: number, sh: number) {
      const cw = cv!.width
      const ch = cv!.height
      const k = Math.max(cw / sw, ch / sh)
      const w = sw * k
      const h = sh * k
      ctx!.drawImage(src, (cw - w) / 2, (ch - h) / 2, w, h)
    }

    function paint() {
      if (!state.dirty) return
      const bmp = nearest(state.clip, state.frame)
      if (bmp) {
        state.dirty = false
        drawCover(bmp, bmp.width, bmp.height)
        return
      }
      // nothing decoded yet: hold the chapter's still so the frame is never empty
      const p = poster(state.clip)
      if (p?.complete && p.naturalWidth) {
        state.dirty = false
        drawCover(p, p.naturalWidth, p.naturalHeight)
      }
    }

    // which chapter owns the canvas, and how far through it we are
    function tick() {
      if (!alive) return
      raf = requestAnimationFrame(tick)
      if (!manifest) return
      const p = scrollRef.current

      // The film ends with the container vessel; the globe has the last word.
      // Without this the canvas went on drawing the final strip over the top of
      // it, and the closing chapters showed a ship instead of the routes.
      const lastFilm = FILM[FILM.length - 1]
      const outFrom = lastFilm.end - (lastFilm.end - lastFilm.start) * 0.25
      const vis = 1 - clamp01((p - outFrom) / (lastFilm.end - outFrom))
      if (vis !== lastVis) {
        lastVis = vis
        cv!.style.opacity = String(vis)
        cv!.style.visibility = vis < 0.01 ? 'hidden' : 'visible'
        grade!.style.opacity = String(vis)
      }
      if (vis < 0.01) return

      let cur = FILM[0]
      for (const f of FILM) if (p >= f.start) cur = f
      const local = clamp01((p - cur.start) / (cur.end - cur.start))
      const s = strips[cur.clip]
      const count = s?.count ?? profile().clips[cur.clip] ?? 1
      // reduced motion holds the opening frame rather than animating
      const frame = reduced ? 0 : Math.min(count - 1, Math.floor(local * count))
      if (cur.clip !== state.clip) {
        state.clip = cur.clip
        poster(cur.clip)
        loadStrip(cur.clip)
        const nx = FILM[FILM.indexOf(cur) + 1]
        if (nx) {
          poster(nx.clip)
          loadStrip(nx.clip)
        }
        evict(cur.clip)
        state.dirty = true
      }
      if (frame !== state.frame) {
        state.frame = frame
        state.dirty = true
      }
      paint()
    }

    let raf = 0
    resize()
    window.addEventListener('resize', resize)

    /**
     * Posters are the first paint and the stand-in while frames stream. Asking
     * for all twenty at boot put them behind each other and behind the frame
     * fetches, so a jump straight to a late chapter could land on a blank
     * canvas. Fetch one when its chapter comes into reach instead.
     */
    function poster(clip: string) {
      if (posters[clip]) return posters[clip]
      const f = FILM.find((x) => x.clip === clip)
      if (!f) return undefined
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        if (clip === state.clip) state.dirty = true
      }
      img.src = f.still
      posters[clip] = img
      return img
    }
    poster(FILM[0].clip)

    ;(async () => {
      avif = await probeAvif()
      const res = await fetch('/assets/frames/frames.json')
      manifest = (await res.json()) as FrameManifest
      if (!alive) return
      loadStrip(FILM[0].clip)
      state.dirty = true
    })()

    raf = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      Object.keys(strips).forEach(release)
    }
  }, [reduced])

  return (
    <div className="film-layer" aria-hidden="true">
      <canvas ref={canvas} className="film-canvas" />
      <div className="plate-grade" ref={gradeRef} />
    </div>
  )
}
