import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useStore } from '@/store/useStore'

export function Loader() {
  const { progress, active } = useProgress()
  const [done, setDone] = useState(false)
  const setReady = useStore((s) => s.setReady)

  useEffect(() => {
    if (!active && progress >= 100) {
      const t = setTimeout(() => {
        setDone(true)
        setReady(true)
      }, 480)
      return () => clearTimeout(t)
    }
  }, [active, progress, setReady])

  // never trap the reader behind a stalled asset
  useEffect(() => {
    const t = setTimeout(() => {
      setDone(true)
      setReady(true)
    }, 14000)
    return () => clearTimeout(t)
  }, [setReady])

  return (
    <div className={`loader${done ? ' done' : ''}`} aria-hidden={done}>
      <div className="inner">
        <div className="lm">Skylark Exim</div>
        <div className="ls">Two Origins. One Standard.</div>
        <div className="track">
          <div className="fill" style={{ width: `${Math.max(6, progress)}%` }} />
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
        ['01 · Visakhapatnam port, 10:00 AM', 'ch01-opening-port'],
        ['02 · The crew boards the vessel', 'ch02-boarding'],
        ['05 · Nets into the Bay of Bengal', 'ch05-nets'],
        ['06 · Swordfish and tuna, the hero catch', 'ch06-catch'],
        ['07 · Onboard chilled storage, −1 °C', 'ch07-chilled-hold'],
        ['09 · Cold-chain transfer at the quay', 'ch09-transfer'],
        ['10 · Processing facility', 'ch10-processing'],
        ['12 · Andhra aquaculture ponds, the second origin', 'ch12-ponds'],
        ['13 · Shrimp product forms: HOSO, HLSO, PUD, PTO', 'ch13-product-forms'],
        ['15 · QC and residue testing', 'ch15-qc'],
        ['16 · IQF freezing and glazing', 'ch16-freezing'],
        ['17 · Cold storage, 700 pallets, −18 to −20 °C', 'ch17-cold-storage'],
        ['18 · Export documentation', 'ch18-documents'],
        ['19 · Reefer container loading', 'ch19-reefer'],
        ['20 · Container vessel departure', 'ch20-container-vessel'],
        ['21 · Global export routes from India', 'ch21-globe'],
      ].map(([label, file]) => (
        <div key={file}>
          <h3>{label}</h3>
          <img className="shot" src={`/assets/media/fallbacks/${file}.jpg`} alt={label} />
        </div>
      ))}
      <p style={{ marginTop: 40 }}>
        Export enquiries: exports@skylarkexim.com · Visakhapatnam, Andhra Pradesh, India
      </p>
    </div>
  )
}
