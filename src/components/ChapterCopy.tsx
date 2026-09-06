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
      <ScrollHint />
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
        // the hero opens the page, so it is already up when the visitor lands.
        // Fading it in from nothing left the first frame with no words on it.
        const rise = hero ? 1 : smoothstep((p - c.start) / inF)
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

/**
 * The only control on the site is the scroll wheel, so the first frame has to
 * say so. It sat inside the hero block before, which positioned it against the
 * copy rather than the viewport and hid it behind the product chips.
 */
function ScrollHint() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const a = 1 - smoothstep(scrollRef.current / 0.012)
      const el = ref.current
      if (el) {
        el.style.opacity = String(a)
        el.style.visibility = a < 0.01 ? 'hidden' : 'visible'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="scroll-hint" ref={ref}>
      <span>Scroll to sail</span>
      <span className="bar" />
    </div>
  )
}

function HeroBlock() {
  const ref = useRef<HTMLDivElement>(null)
  useCopyAnim(ref, chapters[0], true)
  return (
    <div className="hero-mark" ref={ref}>
      <div className="sub">Two Origins. One Standard.</div>
      <h1>Caught in the Bay.<br />Delivered to the world.</h1>
      <p className="lede">
        Swordfish and tuna from the Bay of Bengal. Shrimp from the aquaculture ponds of the
        Andhra coast. A shipment begins long before the container is sealed.
      </p>
      {/* a caption line, the way a film titles a location, not a row of buttons */}
      <div className="hero-meta">
        {['Visakhapatnam · India', 'HACCP', 'EIC'].map((f) => (
          <span key={f}>{f}</span>
        ))}
      </div>
    </div>
  )
}

function Block({ c }: { c: Chapter }) {
  const ref = useRef<HTMLDivElement>(null)
  useCopyAnim(ref, c)
  const Icon = c.icon
  // the RFQ chapter hands the frame to the form
  const hidden = c.id === 'c18-rfq'
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
      {c.detail && (
        <div className="facts detail">
          {c.detail.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
      )}
    </div>
  )
}
