import { useEffect, useRef } from 'react'
import { scrollRef } from '@/store/useStore'
import { chapters, clamp01, lerp, smoothstep } from '@/timeline/chapters'

const ch = (id: string) => chapters.find((c) => c.id === id)!

const CARDINALS: [string, number][] = [
  ['N', 0], ['NE', 45], ['E', 90], ['SE', 135],
  ['S', 180], ['SW', 225], ['W', 270], ['NW', 315],
]

const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0')

/**
 * Premium maritime navigation HUD. Every value is derived from scroll
 * position, so the reader is genuinely steering the voyage.
 */
export function CompassHUD() {
  const wrap = useRef<HTMLDivElement>(null)
  const needle = useRef<SVGGElement>(null)
  const dial = useRef<SVGGElement>(null)
  const bearing = useRef<SVGTextElement>(null)
  const v = {
    time: useRef<HTMLSpanElement>(null),
    sea: useRef<HTMLSpanElement>(null),
    hold: useRef<HTMLSpanElement>(null),
    wind: useRef<HTMLSpanElement>(null),
    heading: useRef<HTMLSpanElement>(null),
    pos: useRef<HTMLSpanElement>(null),
    dist: useRef<HTMLSpanElement>(null),
    status: useRef<HTMLSpanElement>(null),
    swell: useRef<HTMLSpanElement>(null),
  }

  useEffect(() => {
    let raf = 0
    const start = ch('ch03-compass').start
    const end = ch('ch09-cold-chain-transfer').end
    const catchAt = ch('ch06-swordfish-and-tuna').start
    const holdAt = ch('ch07-onboard-cold-storage').start
    const homeAt = ch('ch08-return-to-port').start

    const tick = () => {
      const p = scrollRef.current
      // fade the HUD in for the voyage and out once we are ashore
      const a = clamp01(
        smoothstep((p - (start - 0.014)) / 0.022) - smoothstep((p - (end - 0.012)) / 0.024),
      )
      if (wrap.current) {
        wrap.current.style.opacity = String(a)
        wrap.current.style.transform = `translateY(-50%) translateX(${(1 - a) * 26}px)`
        wrap.current.style.visibility = a < 0.01 ? 'hidden' : 'visible'
      }

      // voyage 0..1 across the ocean chapters
      const t = clamp01((p - start) / (end - start))
      const outbound = clamp01(t / 0.62)
      const inbound = clamp01((t - 0.62) / 0.38)

      // heading: outbound 118 deg (ESE into the Bay), inbound 298 deg back to Vizag
      const hdg = inbound > 0.02 ? lerp(118, 298, smoothstep(inbound)) : lerp(96, 118, outbound)
      const hd = ((hdg % 360) + 360) % 360
      if (dial.current) dial.current.setAttribute('transform', `rotate(${-hd} 80 80)`)
      if (needle.current) needle.current.setAttribute('transform', `rotate(0 80 80)`)
      if (bearing.current) bearing.current.textContent = `${pad(hd, 3)}°`

      // clock runs 10:00 to 16:40
      const mins = 600 + t * 400
      const nm = outbound * 92 - inbound * 92 + (inbound > 0 ? 92 : 0)
      const dist = inbound > 0.02 ? 92 * (1 - inbound) : outbound * 92
      const seaT = lerp(28.4, 27.1, Math.sin(t * Math.PI))
      const holdT = p < holdAt ? lerp(2.0, -0.6, clamp01(t / 0.55)) : lerp(-0.6, -1.2, clamp01((p - holdAt) / 0.08))
      const swell = lerp(0.8, 2.3, Math.sin(clamp01(t / 0.7) * Math.PI))
      const lat = lerp(17.72, 16.42, outbound) + inbound * 1.30
      const lon = lerp(83.30, 85.10, outbound) - inbound * 1.80

      const set = (r: React.RefObject<HTMLSpanElement | null>, s: string) => {
        if (r.current && r.current.textContent !== s) r.current.textContent = s
      }
      set(v.time, `${pad(mins / 60)}:${pad(mins % 60)} IST`)
      set(v.sea, `${seaT.toFixed(1)} °C`)
      set(v.hold, `${holdT.toFixed(1)} °C`)
      set(v.wind, `SW ${(11 + Math.sin(t * 5) * 3).toFixed(0)} kn`)
      set(v.heading, `${pad(hd, 3)}° ${CARDINALS.reduce((b, c) => (Math.abs(((c[1] - hd + 540) % 360) - 180) > Math.abs(((b[1] - hd + 540) % 360) - 180) ? c : b))[0]}`)
      set(v.pos, `${lat.toFixed(2)}° N  ${lon.toFixed(2)}° E`)
      set(v.dist, `${dist.toFixed(0)} nm from Vizag`)
      set(v.swell, `${swell.toFixed(1)} m`)
      set(
        v.status,
        p < catchAt ? 'Outbound' : p < holdAt ? 'Catch on deck' : p < homeAt ? 'Stowed · iced' : 'Inbound',
      )
      void nm

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="hud" ref={wrap} style={{ opacity: 0, visibility: 'hidden' }} aria-hidden="true">
      <div className="hud-card">
        <div className="hud-head">
          <span>Bay of Bengal</span>
          <span className="live">
            <i />
            Underway
          </span>
        </div>

        <div className="compass-wrap">
          <svg className="compass" viewBox="0 0 160 160" role="img" aria-label="Navigation compass">
            <circle className="ring" cx="80" cy="80" r="69" strokeWidth="1" />
            <circle className="ring" cx="80" cy="80" r="56" strokeWidth="0.7" />
            <g ref={dial}>
              {Array.from({ length: 72 }, (_, i) => {
                const major = i % 9 === 0
                const a = (i * 5 * Math.PI) / 180
                const r1 = major ? 58 : 63
                const r2 = 69
                return (
                  <line
                    key={i}
                    className={major ? 'tick major' : 'tick'}
                    x1={80 + Math.sin(a) * r1}
                    y1={80 - Math.cos(a) * r1}
                    x2={80 + Math.sin(a) * r2}
                    y2={80 - Math.cos(a) * r2}
                    strokeWidth={major ? 1.4 : 0.7}
                  />
                )
              })}
              {CARDINALS.map(([label, deg]) => {
                const a = (deg * Math.PI) / 180
                return (
                  <text
                    key={label}
                    className="card"
                    x={80 + Math.sin(a) * 47}
                    y={80 - Math.cos(a) * 47 + 3}
                    textAnchor="middle"
                  >
                    {label}
                  </text>
                )
              })}
            </g>
            <g ref={needle}>
              <polygon className="needle" points="80,20 85,80 80,74 75,80" />
              <polygon className="needle-tail" points="80,140 75,80 80,86 85,80" />
            </g>
            <circle cx="80" cy="80" r="3.4" fill="#d7a84f" />
            <text ref={bearing} className="bearing" x="80" y="106" textAnchor="middle">
              118°
            </text>
            <text className="bearing-label" x="80" y="118" textAnchor="middle">
              ROUTE HEADING
            </text>
          </svg>
        </div>

        <div className="hud-rows">
          <Row k="Time" r={v.time} />
          <Row k="Sea temp" r={v.sea} />
          <Row k="Hold temp" r={v.hold} cls="cold" />
          <Row k="Wind" r={v.wind} />
          <Row k="Swell" r={v.swell} />
          <Row k="Position" r={v.pos} />
          <Row k="Distance" r={v.dist} cls="accent" />
        </div>

        <div className="hud-foot">
          <span>Catch status</span>
          <span className="status" ref={v.status}>
            Outbound
          </span>
        </div>
      </div>
    </div>
  )
}

function Row({
  k,
  r,
  cls = '',
}: {
  k: string
  r: React.RefObject<HTMLSpanElement | null>
  cls?: string
}) {
  return (
    <div className="hud-row">
      <span className="k">{k}</span>
      <span className={`v ${cls}`} ref={r}>
        —
      </span>
    </div>
  )
}
