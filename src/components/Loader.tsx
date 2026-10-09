import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { stillFor } from '@/data/cinematicPlates'

/**
 * What the visitor is waiting for is the opening of the film, so the loader
 * holds until FilmStrip reports the first poster and the first strip's proxies
 * decoded: the first scroll then always has real frames under it.
 */
export function Loader() {
  const progress = useStore((s) => s.loadPct)
  const [done, setDone] = useState(false)
  const setReady = useStore((s) => s.setReady)

  useEffect(() => {
    if (progress < 100) return
    const t = setTimeout(() => {
      setDone(true)
      setReady(true)
    }, 420)
    return () => clearTimeout(t)
  }, [progress, setReady])

  // never trap the reader behind a stalled asset
  useEffect(() => {
    const t = setTimeout(() => {
      setDone(true)
      setReady(true)
    }, 8000)
    return () => clearTimeout(t)
  }, [setReady])

  return (
    <div className={`loader${done ? ' done' : ''}`} aria-hidden={done}>
      <div className="inner">
        <div className="lm">Skylark Exim</div>
        <div className="ls">Two Origins. One Standard.</div>
        <div className="track">
          <div className="fill" style={{ transform: `scaleX(${Math.max(6, progress) / 100})` }} />
        </div>
        <div className="pct">Preparing the voyage · {Math.round(progress)}%</div>
      </div>
    </div>
  )
}

export function NoWebGL() {
  return (
    <div className="nowebgl">
      <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.12em' }}>SKYLARK EXIM</h1>
      <p style={{ color: 'var(--brass)', fontFamily: 'var(--font-mono)', letterSpacing: '0.2em' }}>
        TWO ORIGINS. ONE STANDARD.
      </p>
      <p style={{ maxWidth: '62ch', lineHeight: 1.65 }}>
        This browser could not start WebGL, so the cinematic voyage cannot run. The story is below
        as stills: the Bay of Bengal catch, the cold chain, quality control and residue testing, and
        export from Visakhapatnam to global markets.
      </p>
      {[
        ['01 · Visakhapatnam port, 10:00', 'c01-port'],
        ['02 · The crew boards the vessel', 'c02-boarding'],
        ['03 · The Bay of Bengal', 'c03-voyage'],
        ['04 · Nets over the rail', 'c04-nets'],
        ['05 · Swordfish and tuna, the hero catch', 'c05-catch'],
        ['06 · Onboard chilled storage, −1 °C', 'c06-hold'],
        ['07 · Return to Vizag and cold-chain transfer', 'c07-transfer'],
        ['08 · Processing facility', 'c08-intake'],
        ['09 · Cutting, filleting, portioning', 'c09-cutting'],
        ['10 · Andhra aquaculture ponds, the second origin', 'c10-ponds'],
        ['11 · Shrimp processing and product forms: HOSO, HLSO, PUD, PTO', 'c11-forms'],
        ['12 · QC and residue testing', 'c12-qc'],
        ['13 · Freezing and glazing', 'c13-freezing'],
        ['14 · Cold storage, 700 pallets, −18 to −20 °C', 'c14-coldstore'],
        ['15 · Reefer loading and export documentation', 'c15-reefer'],
        ['16 · Container vessel departure', 'c16-vessel'],
      ].map(([label, file]) => (
        <div key={file}>
          <h3>{label}</h3>
          <img className="shot" src={stillFor(file)} alt={label} />
        </div>
      ))}
      <p style={{ marginTop: 40 }}>
        Export enquiries: exports@skylarkexim.com · Visakhapatnam, Andhra Pradesh, India
      </p>
    </div>
  )
}
