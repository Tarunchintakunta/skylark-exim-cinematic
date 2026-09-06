import { useEffect, useRef } from 'react'
import { scrollRef } from '@/store/useStore'
import { chapters, clamp01, smoothstep, type Chapter } from '@/timeline/chapters'

/**
 * Copy is part of the timeline, not a static section. Each block rises,
 * holds and settles inside its own chapter window.
 */
export function ChapterCopy() {
  return (
    <div className="copy-layer" aria-live="polite">
      <HeroBlock />
      {chapters.slice(1).map((c) => (
        <Block key={c.id} c={c} />
      ))}
    </div>
  )
}

function useCopyAnim(ref: React.RefObject<HTMLDivElement | null>, c: Chapter, hero = false) {
  useEffect(() => {
    let raf = 0
    const span = c.end - c.start
    const inF = span * 0.13
    const outF = span * 0.14
    const tick = () => {
      const p = scrollRef.current
      let a = 0
      let shift = 0
      if (p > c.start - inF && p < c.end + outF) {
        const rise = smoothstep((p - c.start) / inF)
        const fall = 1 - smoothstep((p - (c.end - outF)) / outF)
        a = clamp01(Math.min(rise, fall))
        shift = (1 - rise) * 34 - (1 - fall) * 22
      }
      const el = ref.current
      if (el) {
        el.style.opacity = String(a)
        el.style.transform = hero
          ? `translateY(calc(-58% + ${shift}px))`
          : `translateY(${shift}px)`
        el.style.visibility = a < 0.008 ? 'hidden' : 'visible'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ref, c, hero])
}

function HeroBlock() {
  const ref = useRef<HTMLDivElement>(null)
  useCopyAnim(ref, chapters[0], true)
  return (
    <div className="hero-mark" ref={ref}>
      <div className="sub">Two Origins. One Standard.</div>
      <h1>Caught in the Bay.<br />Delivered to the world.</h1>
      <p className="lede">
        Skylark Exim moves seafood from the Bay of Bengal and the aquaculture ponds of the Andhra
        coast to buyers in Europe, the Gulf, East Asia and North America. A shipment begins long
        before the container is sealed.
      </p>
      <div className="facts" style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 22 }}>
        {['Swordfish', 'Tuna', 'Shrimp', 'Visakhapatnam', 'HACCP · EIC'].map((f) => (
          <span
            key={f}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              border: '1px solid var(--hud-line)',
              background: 'rgba(6,34,44,0.38)',
              backdropFilter: 'blur(6px)',
              padding: '6px 10px',
              borderRadius: 2,
              color: 'rgba(234,246,249,0.9)',
            }}
          >
            {f}
          </span>
        ))}
      </div>
      <div className="scroll-hint">
        <span>Scroll to sail</span>
        <span className="bar" />
      </div>
    </div>
  )
}

function Block({ c }: { c: Chapter }) {
  const ref = useRef<HTMLDivElement>(null)
  useCopyAnim(ref, c)
  const Icon = c.icon
  // the RFQ chapter hands the frame to the form
  const hidden = c.id === 'ch22-rfq'
  if (hidden) return null
  return (
    <div className="chapter-copy" ref={ref} style={{ opacity: 0, visibility: 'hidden' }}>
      <div className="eyebrow">
        <span className="num">{c.num}</span>
        <Icon size={13} strokeWidth={1.6} />
        <span>{c.eyebrow}</span>
      </div>
      <h2>{c.title}</h2>
      {c.lines.map((l) => (
        <p key={l}>{l}</p>
      ))}
      {c.facts && (
        <div className="facts">
          {c.facts.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
      )}
    </div>
  )
}
