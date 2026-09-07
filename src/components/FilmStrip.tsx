import { useEffect, useRef } from 'react'
import { scrollRef, useStore } from '@/store/useStore'
import { chapters, clamp01 } from '@/timeline/chapters'
import { film, stillFor } from '@/data/cinematicPlates'
import { asset } from '@/lib/asset'

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
 * Decoded frames are uncompressed and they do not sit on the JS heap, so
 * nothing warns you before the machine starts to swap: one 1920x1080 bitmap is
 * 8.3 MB and a fifty-frame strip is 415 MB. Carrying whole strips either side
 * of the reader put over a gigabyte of bitmaps in flight and cost frames of
 * 800 ms. The strip is therefore carried at two resolutions instead:
 *
 *   - a 640-wide proxy of *every* frame in reach, 0.9 MB each, so any scroll
 *     position always has a real frame to draw and scrubbing never freezes;
 *   - the full-resolution frame only within a small window either side of the
 *     playhead, which is the only part the reader is actually looking at.
 *
 * Requests are served nearest-the-playhead first and in the direction of
 * travel, so the frame about to be seen loads ahead of the one already passed,
 * and anything that falls out of the window is aborted rather than waited on.
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

type Strip = {
  count: number
  /** 640-wide proxy of every frame: cheap, and it means we are never blank */
  small: (ImageBitmap | null)[]
  /** full-resolution frames, only near the playhead */
  full: (ImageBitmap | null)[]
  asked: Uint8Array
}

/** full-resolution frames held either side of the playhead */
const FULL_RADIUS = 6
/** how many strips either side keep their proxy */
const KEEP_NEAR = 1
/** six at a time keeps the connection busy without piling up decodes */
const MAX_INFLIGHT = 6

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
    const posters: Record<string, HTMLImageElement> = {}

    type Job = { clip: string; i: number; full: boolean; ctrl: AbortController }
    const queue: Job[] = []
    const inflight = new Set<Job>()
    const state = { clip: '', next: '', frame: 0, dir: 1, dirty: true }
    let lastVis = -1

    const profile = () => (isMobile ? manifest!.mobile : manifest!.desktop)

    const url = (clip: string, i: number, full: boolean) => {
      const p = profile()
      const n = String(i + 1).padStart(4, '0')
      const ext = full && avif ? 'avif' : 'webp'
      return asset(`${p.dir}/${clip}/${n}.${ext}`)
    }

    /**
     * What a job is worth to the reader right now: how many frames away it is,
     * with anything behind the direction of travel pushed back, anything in
     * another strip pushed back further, and full-resolution work behind the
     * proxy that keeps the canvas moving.
     */
    const cost = (j: Job) => {
      if (j.clip === state.clip) {
        const d = j.i - state.frame
        const ahead = d * state.dir >= 0
        return Math.abs(d) * (ahead ? 1 : 4) + (j.full ? 60 : 0)
      }
      // The opening of the chapter about to arrive matters more than sharpening
      // the one being left, or the cut lands on a frame that is not there yet.
      if (j.clip === state.next && !j.full) return 120 + j.i
      return 5000 + j.i
    }

    function pump() {
      while (alive && inflight.size < MAX_INFLIGHT && queue.length) {
        // nearest the playhead first, rather than whatever was asked for first
        let best = 0
        let bestCost = cost(queue[0])
        for (let k = 1; k < queue.length; k++) {
          const c = cost(queue[k])
          if (c < bestCost) {
            bestCost = c
            best = k
          }
        }
        const job = queue.splice(best, 1)[0]
        if (!strips[job.clip]) continue
        inflight.add(job)
        fetch(url(job.clip, job.i, job.full), { signal: job.ctrl.signal })
          .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
          .then((b) => createImageBitmap(b))
          .then((bmp) => {
            const st = strips[job.clip]
            if (!alive || !st) return bmp.close?.()
            const slot = job.full ? st.full : st.small
            if (slot[job.i]) bmp.close?.()
            else {
              slot[job.i] = bmp
              if (job.clip === state.clip) state.dirty = true
            }
          })
          .catch(() => {})
          .finally(() => {
            inflight.delete(job)
            pump()
          })
      }
    }

    const ask = (clip: string, i: number, full: boolean) => {
      const s = strips[clip]
      if (!s) return
      const bit = full ? 2 : 1
      if (s.asked[i] & bit) return
      if ((full ? s.full : s.small)[i]) return
      s.asked[i] |= bit
      queue.push({ clip, i, full, ctrl: new AbortController() })
    }

    function openStrip(clip: string) {
      if (strips[clip] || !manifest) return
      const count = profile().clips[clip]
      if (!count) return
      strips[clip] = {
        count,
        small: new Array(count).fill(null),
        full: new Array(count).fill(null),
        asked: new Uint8Array(count),
      }
      // the proxy of the whole strip: this is what makes scrubbing continuous
      for (let i = 0; i < count; i++) ask(clip, i, false)
      pump()
    }

    /**
     * Full resolution only where the reader is; drop and abort the rest.
     *
     * While the reader is moving quickly a full frame cannot arrive before it
     * is already behind them, so asking for one only takes bandwidth from the
     * proxy that is actually being drawn. Moving fast therefore narrows the
     * window to the frame in hand, and the rest fills in when the scroll
     * settles.
     */
    function windowFull(clip: string, centre: number, radius = FULL_RADIUS) {
      const s = strips[clip]
      if (!s) return
      const lo = Math.max(0, centre - radius)
      const hi = Math.min(s.count - 1, centre + radius)
      for (let i = lo; i <= hi; i++) ask(clip, i, true)
      for (let i = 0; i < s.count; i++) {
        if (i >= lo && i <= hi) continue
        if (s.full[i]) {
          s.full[i]!.close?.()
          s.full[i] = null
          s.asked[i] &= ~2
        }
      }
      // stop fetching full frames the reader has already scrolled past
      for (let k = queue.length - 1; k >= 0; k--) {
        const j = queue[k]
        if (j.full && j.clip === clip && (j.i < lo || j.i > hi)) {
          s.asked[j.i] &= ~2
          queue.splice(k, 1)
        }
      }
      for (const j of inflight) {
        if (j.full && j.clip === clip && (j.i < lo || j.i > hi)) {
          s.asked[j.i] &= ~2
          j.ctrl.abort()
        }
      }
    }

    function release(clip: string) {
      const s = strips[clip]
      if (!s) return
      s.small.forEach((b) => b?.close?.())
      s.full.forEach((b) => b?.close?.())
      delete strips[clip]
      for (let k = queue.length - 1; k >= 0; k--) if (queue[k].clip === clip) queue.splice(k, 1)
      for (const j of inflight) if (j.clip === clip) j.ctrl.abort()
    }

    /** carry the strip in hand and its immediate neighbours; free the rest */
    function evict(clip: string) {
      const i = FILM.findIndex((f) => f.clip === clip)
      if (i < 0) return
      const keep = new Set<string>([clip])
      for (let k = 1; k <= KEEP_NEAR; k++) {
        if (FILM[i + k]) keep.add(FILM[i + k].clip)
        if (FILM[i - k]) keep.add(FILM[i - k].clip)
      }
      for (const k of Object.keys(strips)) if (!keep.has(k)) release(k)
    }

    /** the sharpest thing we have at or near this frame */
    const pick = (clip: string, i: number) => {
      const s = strips[clip]
      if (!s) return null
      if (s.full[i]) return s.full[i]
      if (s.small[i]) return s.small[i]
      for (let d = 1; d < s.count; d++) {
        if (s.small[i - d]) return s.small[i - d]
        if (s.small[i + d]) return s.small[i + d]
        if (s.full[i - d]) return s.full[i - d]
        if (s.full[i + d]) return s.full[i + d]
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
      const bmp = pick(state.clip, state.frame)
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

    // which strip owns the canvas, and how far through it we are
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

      if (scrollRef.velocity > 0) state.dir = 1
      else if (scrollRef.velocity < 0) state.dir = -1

      const movedStrip = cur.clip !== state.clip
      if (movedStrip) {
        state.clip = cur.clip
        openStrip(cur.clip)
        evict(cur.clip)
        state.dirty = true
      }
      state.next = FILM[FILM.indexOf(cur) + 1]?.clip ?? ''
      if (frame !== state.frame || movedStrip) {
        state.frame = frame
        state.dirty = true
        // how many frames this update advanced: the honest measure of "fast",
        // because it already accounts for how long the chapter's band is
        const perTick = (Math.abs(scrollRef.velocity) / (cur.end - cur.start)) * count
        windowFull(cur.clip, frame, perTick > 1.5 ? 1 : FULL_RADIUS)
        // open the next strip early enough that its opening frames are decoded
        // before the cut, and late enough not to compete for the whole chapter
        if (state.next && local > 0.45) openStrip(state.next)
        pump()
      }
      paint()
    }

    let raf = 0
    resize()
    window.addEventListener('resize', resize)

    /**
     * Posters are the first paint and the stand-in while frames stream. Asking
     * for all eighteen at boot put them behind each other and behind the frame
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
      const res = await fetch(asset('/assets/frames/frames.json'))
      manifest = (await res.json()) as FrameManifest
      if (!alive) return
      resize()
      openStrip(FILM[0].clip)
      windowFull(FILM[0].clip, 0)
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
