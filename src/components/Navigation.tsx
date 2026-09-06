import { useEffect, useRef, useState } from 'react'
import { scrollRef, useStore } from '@/store/useStore'
import { chapters } from '@/timeline/chapters'
import { scrollToProgress } from '@/timeline/useScrollTimeline'

const NAV: { label: string; chapter: string }[] = [
  { label: 'Origins', chapter: 'c03-voyage' },
  { label: 'Catch', chapter: 'c05-catch' },
  { label: 'Process', chapter: 'c08-intake' },
  { label: 'Products', chapter: 'c11-shrimp' },
  { label: 'Quality', chapter: 'c12-qc' },
  { label: 'Cold Chain', chapter: 'c14-coldstore' },
  { label: 'Export', chapter: 'c17-routes' },
]

const goto = (chapterId: string) => {
  const c = chapters.find((x) => x.id === chapterId)
  if (c) scrollToProgress(c.start + (c.end - c.start) * 0.14)
}

export function TopBar() {
  const idx = useStore((s) => s.chapterIndex)
  return (
    <header className="topbar">
      <a
        className="wordmark"
        href="#top"
        onClick={(e) => {
          e.preventDefault()
          scrollToProgress(0)
        }}
      >
        <span className="mark">
          <i />
        </span>
        Skylark Exim
        <small>Seafood Export · India</small>
      </a>
      <nav className="navlinks" aria-label="Chapters">
        {NAV.map((n) => {
          const c = chapters.find((x) => x.id === n.chapter)!
          const active = idx >= c.index && idx < c.index + 2
          return (
            <button key={n.label} data-active={active} onClick={() => goto(n.chapter)}>
              {n.label}
            </button>
          )
        })}
      </nav>
      <button className="cta-quote" onClick={() => goto('c18-rfq')}>
        Request Export Quote
      </button>
    </header>
  )
}

export function ChapterRail() {
  const idx = useStore((s) => s.chapterIndex)
  return (
    <nav className="rail" aria-label="Voyage timeline">
      {chapters.map((c) => (
        <button
          key={c.id}
          data-active={c.index === idx}
          onClick={() => scrollToProgress(c.start + (c.end - c.start) * 0.12)}
          title={`${c.num} · ${c.nav}`}
        >
          <span className="tick" />
          <span className="label">{c.nav}</span>
        </button>
      ))}
    </nav>
  )
}

export function ProgressBar() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (ref.current) ref.current.style.width = `${scrollRef.current * 100}%`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div className="progressbar" ref={ref} style={{ width: 0 }} />
}

export function ClosingLine() {
  const idx = useStore((s) => s.chapterIndex)
  const [line, setLine] = useState('Visakhapatnam · Andhra Pradesh · India')
  useEffect(() => {
    setLine(
      // a location line, the way a film captions where it is: no slogans
      idx >= 16
        ? 'Europe · The Gulf · East Asia · North America'
        : idx >= 7
          ? 'Visakhapatnam · HACCP · EIC · Tested every batch'
          : 'Visakhapatnam · Andhra Pradesh · India',
    )
  }, [idx])
  return (
    <div className="closing">
      <span>{line}</span>
      <span>Two Origins. One Standard.</span>
    </div>
  )
}
