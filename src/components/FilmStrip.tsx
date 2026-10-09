import { useEffect, useRef } from 'react'
import gsap from 'gsap'
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
 * for the whole film instead of one per chapter. (scripts/video-bench.mjs
 * re-measured an all-keyframe video against the strips: the video showed the
 * right frame on 53% of ticks against 100%, and cost more bytes.)
 *
 * Decoded frames are uncompressed and they do not sit on the JS heap, so
 * nothing warns you before the machine starts to swap: one 1600x900 bitmap is
 * 5.8 MB. Carrying whole strips either side of the reader put over a gigabyte
 * of bitmaps in flight and cost frames of 800 ms. The strip is therefore
 * carried at two resolutions instead:
 *
 *   - a small proxy of every second or fourth frame in reach, so any scroll position
 *     always has a real frame to draw and scrubbing never freezes;
 *   - the full-resolution frame only within a small window either side of the
 *     playhead, which is the only part the reader is actually looking at.
 *
 * Requests are served nearest-the-playhead first and in the direction of
 * travel, so the frame about to be seen loads ahead of the one already passed,
 * and anything that falls out of the window is aborted rather than waited on.
 * Fetching and decoding both happen in a worker (frameWorker.ts); the main
 * thread only ever receives a finished bitmap and draws it.
 */

interface Profile {
  dir: string
  w: number
  h: number
  /** proxies exist for every proxyEvery-th frame, and the last */
  proxyEvery: number
  clips: Record<string, number>
}
interface FrameManifest {
  desktop: Profile
  mobile: Profile
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
    index: c.index,
    start: c.start + ((c.end - c.start) * i) / n,
    end: c.start + ((c.end - c.start) * (i + 1)) / n,
  }))
})

type Strip = {
  count: number
  /** proxy frames: cheap, and they mean we are never blank */
  small: (ImageBitmap | null)[]
  /** full-resolution frames, only near the playhead */
  full: (ImageBitmap | null)[]
  asked: Uint8Array
  /** when the strip was opened, so a cut can wait a beat for its proxies */
  opened: number
}

/**
 * The mobile set is the centre 720x900 of each frame. A viewport covers a
 * 16:9 frame by its height once it is narrower than 0.8 of its height, so the
 * slice then holds every pixel that would have been visible anyway.
 */
const wantsMobileSet = () =>
  window.innerWidth / window.innerHeight <= 0.8 &&
  (window.innerWidth <= 767 || window.matchMedia('(pointer: coarse)').matches)

/**
 * How much to carry and how much to ask for at once. A phone has less memory
 * for bitmaps and one connection that a queue of six only congests, so it
 * keeps a tighter window and fewer requests in flight.
 */
const tuning = (mobile: boolean) =>
  mobile ? { fullRadius: 3, maxInflight: 4 } : { fullRadius: 6, maxInflight: 6 }
/** how many strips either side keep their proxies */
const KEEP_NEAR = 1

const AVIF_PROBE =
  'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A='

const probeAvif = () =>
  new Promise<boolean>((res) => {
    const i = new Image()
    i.onload = () => res(true)
    i.onerror = () => res(false)
    i.src = AVIF_PROBE
  })

/** One decode worker for the page, shared across effect re-runs. */
let worker: Worker | null = null
let seq = 0
const pending = new Map<number, { resolve: (b: ImageBitmap) => void; reject: (e: unknown) => void }>()

function decodeFrame(url: string, signal: AbortSignal) {
  if (!worker) {
    worker = new Worker(new URL('./frameWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<{ id: number; bmp?: ImageBitmap; error?: string }>) => {
      const { id, bmp, error } = e.data
      const p = pending.get(id)
      if (!p) return bmp?.close()
      pending.delete(id)
      if (bmp) p.resolve(bmp)
      else p.reject(error)
    }
  }
  const id = ++seq
  const w = worker
  return new Promise<ImageBitmap>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    w.postMessage({ id, url: new URL(url, location.href).href })
    signal.addEventListener(
      'abort',
      () => {
        if (!pending.delete(id)) return
        w.postMessage({ abort: id })
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

export function FilmStrip() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const gradeRef = useRef<HTMLDivElement>(null)
  const reduced = useStore((s) => s.reducedMotion)
  const setLoadPct = useStore((s) => s.setLoadPct)

  useEffect(() => {
    const cv = canvas.current
    const grade = gradeRef.current
    if (!cv || !grade) return
    const ctx = cv.getContext('2d', { alpha: false })
    if (!ctx) return

    let alive = true
    let manifest: FrameManifest | null = null
    let avif = false
    let isMobile = wantsMobileSet()
    let tune = tuning(isMobile)
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
     * The loader holds until the opening is ready to scrub: the first strip's
     * proxies and its poster. Only the opening strip reports here.
     */
    const boot = { need: 0, have: 0, done: false }
    const booted = () => {
      if (boot.done) return
      boot.have++
      const pct = boot.need ? Math.min(100, Math.round((boot.have / boot.need) * 100)) : 100
      if (pct >= 100) boot.done = true
      setLoadPct(pct)
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
        // a sharp frame at the playhead outranks a proxy a dozen frames off:
        // with every proxy ahead of every full frame, a slow connection spent
        // the whole chapter drawing proxies
        return Math.abs(d) * (ahead ? 1 : 4) + (j.full ? 12 : 0)
      }
      // The opening of the chapter about to arrive matters more than sharpening
      // the one being left, or the cut lands on a frame that is not there yet.
      if (j.clip === state.next && !j.full) return 120 + j.i
      return 5000 + j.i
    }

    function pump() {
      while (alive && inflight.size < tune.maxInflight && queue.length) {
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
        decodeFrame(url(job.clip, job.i, job.full), job.ctrl.signal)
          .then((bmp) => {
            const st = strips[job.clip]
            if (!alive || !st) return bmp.close()
            const slot = job.full ? st.full : st.small
            if (slot[job.i]) bmp.close()
            else {
              slot[job.i] = bmp
              if (job.clip === state.clip) state.dirty = true
              if (!job.full && job.clip === FILM[0].clip) booted()
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

    /** the frames that carry a proxy: every proxyEvery-th, and the last */
    const hasProxy = (s: Strip, i: number) => i % profile().proxyEvery === 0 || i === s.count - 1

    function openStrip(clip: string) {
      if (strips[clip] || !manifest) return
      const count = profile().clips[clip]
      if (!count) return
      const s: Strip = {
        count,
        small: new Array(count).fill(null),
        full: new Array(count).fill(null),
        asked: new Uint8Array(count),
        opened: performance.now(),
      }
      strips[clip] = s
      // the proxies of the whole strip: this is what makes scrubbing continuous
      for (let i = 0; i < count; i++) if (hasProxy(s, i)) ask(clip, i, false)
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
    function windowFull(clip: string, centre: number, radius = tune.fullRadius) {
      const s = strips[clip]
      if (!s) return
      const lo = Math.max(0, centre - radius)
      const hi = Math.min(s.count - 1, centre + radius)
      // ask outward from the playhead, so equal-cost ties go to the nearer frame
      ask(clip, centre, true)
      for (let d = 1; d <= radius; d++) {
        if (centre + d <= hi) ask(clip, centre + d, true)
        if (centre - d >= lo) ask(clip, centre - d, true)
      }
      for (let i = 0; i < s.count; i++) {
        if (i >= lo && i <= hi) continue
        if (s.full[i]) {
          s.full[i]!.close()
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
      s.small.forEach((b) => b?.close())
      s.full.forEach((b) => b?.close())
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

    /**
     * What each painted frame actually was, for scripts/trace.mjs: the sharp
     * frame, the proxy of the right frame, a neighbouring frame, or the poster.
     */
    const stats = { full: 0, proxy: 0, near: 0, poster: 0 }
    ;(window as unknown as { __FILM_STATS__?: typeof stats }).__FILM_STATS__ = stats
    let picked: 'full' | 'proxy' | 'near' = 'near'

    /** the sharpest thing we have at or near this frame */
    const pick = (clip: string, i: number) => {
      const s = strips[clip]
      if (!s) return null
      picked = 'full'
      if (s.full[i]) return s.full[i]
      picked = 'proxy'
      if (s.small[i]) return s.small[i]
      picked = 'near'
      for (let d = 1; d < s.count; d++) {
        if (s.full[i - d]) return s.full[i - d]
        if (s.full[i + d]) return s.full[i + d]
        if (s.small[i - d]) return s.small[i - d]
        if (s.small[i + d]) return s.small[i + d]
      }
      return null
    }

    /**
     * The backing store never holds more pixels than the frame has. The frame
     * is drawn to cover, so the canvas can be as large as the source in both
     * directions and no larger: anything beyond that is the canvas upscaling
     * into a bigger buffer, a larger draw and composite every frame for
     * nothing. The compositor stretches the canvas to the viewport instead.
     */
    function resize() {
      const mobile = wantsMobileSet()
      if (manifest && mobile !== isMobile) {
        // a rotation can change which set fits: start the strips again
        Object.keys(strips).forEach(release)
        Object.keys(posters).forEach((k) => delete posters[k])
        state.clip = ''
      }
      isMobile = mobile
      tune = tuning(isMobile)
      const p = manifest ? profile() : { w: 1600, h: 900 }
      const iw = window.innerWidth
      const ih = window.innerHeight
      const scale = Math.min(window.devicePixelRatio || 1, p.w / iw, p.h / ih)
      cv!.width = Math.round(iw * scale)
      cv!.height = Math.round(ih * scale)
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
      // reduced motion holds each chapter's still rather than scrubbing
      const bmp = reduced ? null : pick(state.clip, state.frame)
      if (bmp) {
        state.dirty = false
        stats[picked]++
        drawCover(bmp, bmp.width, bmp.height)
        return
      }
      // A strip opened a moment ago usually has its proxies a moment away, and
      // the canvas still holds the last frame drawn, so give them a beat before
      // fetching a poster that would only be on screen for a frame or two.
      const s = strips[state.clip]
      if (s && performance.now() - s.opened < 250) return
      // nothing decoded yet: hold the chapter's still so the frame is never empty
      const p = poster(state.clip)
      if (p?.complete && p.naturalWidth) {
        state.dirty = false
        stats.poster++
        drawCover(p, p.naturalWidth, p.naturalHeight)
      }
    }

    /**
     * Posters are the first paint and the stand-in while frames stream. They
     * are fetched one at a time as each chapter comes into reach, not all at
     * boot, where they would queue behind each other and the frames.
     */
    function poster(clip: string) {
      if (posters[clip]) return posters[clip]
      if (!manifest) return undefined
      const img = new Image()
      img.decoding = 'async'
      img.onload = img.onerror = () => {
        if (clip === state.clip) state.dirty = true
        if (clip === FILM[0].clip) booted()
      }
      img.src = stillFor(clip, isMobile, avif ? 'avif' : 'webp')
      posters[clip] = img
      return img
    }

    // which strip owns the canvas, and how far through it we are
    let lastP = -1
    function tick() {
      if (!alive || !manifest) return
      const p = scrollRef.current
      // nothing moved and nothing new arrived: the canvas already shows it
      if (p === lastP && !state.dirty) return
      lastP = p

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
      const count = profile().clips[cur.clip] ?? 1
      const frame = reduced ? 0 : Math.min(count - 1, Math.floor(local * count))

      if (scrollRef.velocity > 0) state.dir = 1
      else if (scrollRef.velocity < 0) state.dir = -1

      const movedStrip = cur.clip !== state.clip
      if (movedStrip) {
        state.clip = cur.clip
        if (!reduced) {
          openStrip(cur.clip)
          evict(cur.clip)
        }
        state.dirty = true
      }
      state.next = FILM[FILM.indexOf(cur) + 1]?.clip ?? ''
      if (!reduced && (frame !== state.frame || movedStrip)) {
        state.frame = frame
        state.dirty = true
        // how many frames this update advanced: the honest measure of "fast",
        // because it already accounts for how long the chapter's band is
        const perTick = (Math.abs(scrollRef.velocity) / (cur.end - cur.start)) * count
        windowFull(cur.clip, frame, perTick > 1.5 ? 1 : tune.fullRadius)
        // open the next strip early enough that its opening frames are decoded
        // before the cut, and late enough not to compete for the whole chapter
        if (state.next && local > 0.45) openStrip(state.next)
        pump()
      }
      paint()
    }

    resize()
    window.addEventListener('resize', resize)

    ;(async () => {
      avif = await probeAvif()
      const res = await fetch(asset('/assets/frames/frames.json'))
      manifest = (await res.json()) as FrameManifest
      if (!alive) return
      resize()
      const first = FILM[0].clip
      const count = profile().clips[first]
      // the loader waits for the opening poster, plus the opening proxies when
      // the film is going to scrub
      const every = profile().proxyEvery
      boot.need = 1 + (reduced ? 0 : Math.ceil(count / every) + ((count - 1) % every ? 1 : 0))
      poster(first)
      if (!reduced) {
        openStrip(first)
        windowFull(first, 0)
        pump()
      }
      state.dirty = true
    })()

    // one loop per frame for the whole page: GSAP's ticker, which Lenis and
    // ScrollTrigger already run on
    gsap.ticker.add(tick)
    return () => {
      alive = false
      gsap.ticker.remove(tick)
      window.removeEventListener('resize', resize)
      Object.keys(strips).forEach(release)
    }
  }, [reduced, setLoadPct])

  return (
    <div className="film-layer" aria-hidden="true">
      <canvas ref={canvas} className="film-canvas" />
      <div className="plate-grade" ref={gradeRef} />
    </div>
  )
}
