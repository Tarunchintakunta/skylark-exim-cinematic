import { useEffect, useRef, useState } from 'react'
import { scrollRef, useStore } from '@/store/useStore'
import { chapters, clamp01, smoothstep } from '@/timeline/chapters'
import { cinematicPlates, type CinematicPlate, type PlateMove } from '@/data/cinematicPlates'

/**
 * The film layer. This is the base image of the site, not an overlay on it.
 *
 * Plates paint in chapter order, so a plate rising covers the one before it and
 * no gap ever opens onto the geometry underneath. Each one holds a slow camera
 * move for the length of its chapter, and its clip runs faster the faster the
 * visitor scrolls, so the footage answers the wheel instead of looping to its
 * own clock.
 */
export function CinematicPlates() {
  return (
    <div className="plate-layer">
      {cinematicPlates.map((p, i) => (
        <Plate key={p.chapter} plate={p} next={cinematicPlates[i + 1]} />
      ))}
    </div>
  )
}

/** How far the plate travels across its chapter, in percent of the frame. */
const MOVES: Record<PlateMove, (t: number) => string> = {
  // t runs 0 to 1 across the chapter
  in: (t) => `scale(${1.16 - t * 0.14})`,
  out: (t) => `scale(${1.02 + t * 0.14})`,
  left: (t) => `scale(1.14) translate3d(${(0.5 - t) * 4.5}%, 0, 0)`,
  right: (t) => `scale(1.14) translate3d(${(t - 0.5) * 4.5}%, 0, 0)`,
  up: (t) => `scale(${1.14 - t * 0.06}) translate3d(0, ${(0.5 - t) * 4.0}%, 0)`,
}

function Plate({ plate, next }: { plate: CinematicPlate; next?: CinematicPlate }) {
  const wrap = useRef<HTMLDivElement>(null)
  const vid = useRef<HTMLVideoElement>(null)
  const [active, setActive] = useState(false)
  const [videoOk, setVideoOk] = useState(true)
  const reduced = useStore((s) => s.reducedMotion)
  const chapter = chapters.find((c) => c.id === plate.chapter)

  useEffect(() => {
    if (!chapter) return
    let raf = 0
    const span = chapter.end - chapter.start
    // rise into the chapter, and start a little early so the dissolve is
    // already under way when the previous chapter's copy leaves
    const lead = span * 0.22
    const rise = span * 0.30
    const start = chapter.start - lead

    // where this plate gives way: just after the next one has fully covered it,
    // or at the end of its own chapter when it is the last of the film
    const nextChapter = next ? chapters.find((c) => c.id === next.chapter) : undefined
    let outFrom: number | null = null
    let outSpan = span * 0.18
    if (nextChapter) {
      const nSpan = nextChapter.end - nextChapter.start
      outFrom = nextChapter.start - nSpan * 0.22 + nSpan * 0.30
      outSpan = nSpan * 0.12
    } else if (plate.release) {
      outFrom = chapter.end - span * 0.20
      outSpan = span * 0.20
    }

    let live = false
    let lastP = scrollRef.current
    let lastT = performance.now()
    let vel = 0

    const tick = () => {
      const p = scrollRef.current
      const now = performance.now()
      const dt = Math.max(16, now - lastT)
      // page fractions per second, smoothed; drives how fast the clip runs
      const raw = (Math.abs(p - lastP) / dt) * 1000
      vel += (raw - vel) * 0.12
      lastP = p
      lastT = now

      // Up once its own chapter arrives, down once the next plate is fully up.
      // Leaving them up forever meant that when the last plate released, an
      // older one was still sitting behind it and took the globe's frame.
      let a = clamp01(smoothstep((p - start) / rise))
      if (outFrom !== null) a = Math.min(a, 1 - clamp01(smoothstep((p - outFrom) / outSpan)))

      const el = wrap.current
      if (el) {
        el.style.opacity = String(a)
        el.style.visibility = a < 0.004 ? 'hidden' : 'visible'
        const t = clamp01((p - chapter.start) / span)
        el.style.transform = MOVES[plate.move](t)
      }

      const v = vid.current
      if (v && !v.paused) {
        // a still frame when the visitor stops, real motion when they move
        v.playbackRate = Math.min(2.4, 0.18 + vel * 26)
      }

      const shouldBeLive = a > 0.004
      if (shouldBeLive !== live) {
        live = shouldBeLive
        setActive(shouldBeLive)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [chapter, plate, next])

  // only the plates on screen are decoding video
  useEffect(() => {
    const v = vid.current
    if (!v) return
    if (active && !reduced) {
      const play = v.play()
      if (play && typeof play.catch === 'function') play.catch(() => setVideoOk(false))
    } else {
      v.pause()
    }
  }, [active, reduced])

  if (!chapter) return null
  const useVideo = Boolean(plate.video) && videoOk && !reduced

  return (
    <div className="plate" ref={wrap} style={{ opacity: 0, visibility: 'hidden' }}>
      {active && useVideo ? (
        <video
          ref={vid}
          className="plate-media"
          src={plate.video}
          poster={plate.still}
          muted
          loop
          playsInline
          preload="none"
          aria-label={plate.alt}
          onError={() => setVideoOk(false)}
        />
      ) : (
        <img className="plate-media" src={plate.still} alt={plate.alt} loading="lazy" decoding="async" />
      )}
      <div className="plate-grade" />
    </div>
  )
}
