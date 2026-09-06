import { useEffect, useRef, useState } from 'react'
import { scrollRef, useStore } from '@/store/useStore'
import { chapters, clamp01, smoothstep } from '@/timeline/chapters'
import { cinematicPlates, type CinematicPlate } from '@/data/cinematicPlates'

/**
 * The film cuts. Each plate dissolves over the WebGL scene for one beat of its
 * chapter and dissolves away again, so the voyage alternates between the model
 * of the operation and footage of it.
 */
export function CinematicPlates() {
  return (
    <div className="plate-layer" aria-hidden="false">
      {cinematicPlates.map((p) => (
        <Plate key={p.chapter} plate={p} />
      ))}
    </div>
  )
}

function Plate({ plate }: { plate: CinematicPlate }) {
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
    const start = chapter.start + span * plate.from
    const end = chapter.start + span * plate.to
    const fade = (end - start) * 0.30
    let live = false

    const tick = () => {
      const p = scrollRef.current
      let a = 0
      if (p > start - fade && p < end + fade) {
        const rise = smoothstep((p - start) / fade)
        const fall = 1 - smoothstep((p - (end - fade)) / fade)
        a = clamp01(Math.min(rise, fall)) * plate.peak
      }
      const el = wrap.current
      if (el) {
        el.style.opacity = String(a)
        el.style.visibility = a < 0.004 ? 'hidden' : 'visible'
        el.style.transform = `scale(${1.06 - a * 0.06})`
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
  }, [chapter, plate])

  // only the plate on screen is decoding video
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
