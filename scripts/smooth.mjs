/**
 * Scroll the whole film the way a reader does and report what the main thread
 * and the heap are doing, plus how often the canvas has no real frame to draw.
 */
import { chromium } from 'playwright'

const URL = (process.env.QA_URL ?? 'http://127.0.0.1:4173/') + '?qa=1'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: Number(process.env.DPR ?? 1) })
await p.goto(URL, { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)

await p.evaluate(() => {
  window.__M = { frames: [], last: performance.now(), long: 0 }
  const tick = () => {
    const n = performance.now()
    const dt = n - window.__M.last
    window.__M.last = n
    window.__M.frames.push(dt)
    if (dt > 50) window.__M.long++
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})

const samples = []
const STEPS = 130
for (let i = 0; i <= STEPS; i++) {
  await p.mouse.wheel(0, 320)          // a real wheel event, so Lenis is exercised
  await p.waitForTimeout(60)
  if (i % 10 === 0) {
    const s = await p.evaluate(() => {
      const m = performance.memory
      return {
        pct: +(window.scrollY / (document.documentElement.scrollHeight - innerHeight)).toFixed(3),
        heapMB: Math.round(m.usedJSHeapSize / 1e6),
      }
    })
    samples.push(s)
  }
}

const r = await p.evaluate(() => {
  const f = window.__M.frames.slice(10)
  const sorted = [...f].sort((a, b) => a - b)
  const q = (x) => Math.round(sorted[Math.floor(sorted.length * x)] * 10) / 10
  return { n: f.length, p50: q(0.5), p90: q(0.9), p99: q(0.99), worst: Math.round(Math.max(...f)), long: window.__M.long }
})
console.log('frame times while wheeling:', JSON.stringify(r))
console.log('heap by scroll position:')
for (const s of samples) console.log(`  ${String(s.pct).padStart(6)}  ${String(s.heapMB).padStart(5)} MB`)
console.log('peak heap:', Math.max(...samples.map((s) => s.heapMB)), 'MB')
await b.close()
