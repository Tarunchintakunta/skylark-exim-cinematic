import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useStore } from '@/store/useStore'
import { cinematicPlates } from '@/data/cinematicPlates'
import { asset } from '@/lib/asset'

export function Loader() {
  const { progress: glProgress, active } = useProgress()
  const [imgReady, setImgReady] = useState(false)
  const [done, setDone] = useState(false)
  const setReady = useStore((s) => s.setReady)

  // What the visitor is actually waiting for is the first frame of the film.
  // Waiting on WebGL progress left the loader pinned at nought per cent, because
  // the opening chapters no longer load any geometry at all.
  useEffect(() => {
    const first = cinematicPlates[0]
    if (!first) return setImgReady(true)
    const img = new Image()
    img.onload = () => setImgReady(true)
    img.onerror = () => setImgReady(true)
    img.src = first.still
    if (img.complete) setImgReady(true)
  }, [])

  const progress = imgReady ? 100 : Math.min(92, 16 + glProgress * 0.8)

  useEffect(() => {
    if (imgReady && !active) {
      const t = setTimeout(() => {
        setDone(true)
        setReady(true)
      }, 420)
      return () => clearTimeout(t)
    }
  }, [imgReady, active, setReady])

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
          <img className="shot" src={asset(`/assets/media/higgsfield/stills/${file}.jpg`)} alt={label} />
        </div>
      ))}
      <p style={{ marginTop: 40 }}>
        Export enquiries: exports@skylarkexim.com · Visakhapatnam, Andhra Pradesh, India
      </p>
    </div>
  )
}
