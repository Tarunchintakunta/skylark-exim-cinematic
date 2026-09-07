/** Same measurements, but on the real GPU: headless falls back to SwiftShader. */
import { chromium } from 'playwright'
const base = process.env.QA_URL ?? 'http://127.0.0.1:4173/'
const b = await chromium.launch({ headless: false })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto(base + '?qa=1', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)
console.log('renderer:', await p.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2')
  const d = gl.getExtension('WEBGL_debug_renderer_info')
  return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?'
}))
for (const pos of [0.5, 0.9, 0.99]) {
  await p.evaluate((x) => { const m=document.documentElement.scrollHeight-innerHeight; window.scrollTo(0, x*m) }, pos)
  await p.waitForTimeout(3000)
  const r = await p.evaluate(async () => {
    const f=[]; let last=performance.now()
    await new Promise(d=>{let n=0;const t=()=>{const x=performance.now();f.push(x-last);last=x;if(++n<100)requestAnimationFrame(t);else d()};requestAnimationFrame(t)})
    const s=f.slice(10).sort((a,b)=>a-b)
    return { p50:+s[Math.floor(s.length*0.5)].toFixed(1), p90:+s[Math.floor(s.length*0.9)].toFixed(1) }
  })
  console.log(`  parked at ${pos}:  p50=${r.p50}ms  p90=${r.p90}ms`)
}
// and a real wheel run of the whole film
await p.evaluate(() => window.scrollTo(0,0))
await p.waitForTimeout(1500)
await p.evaluate(() => { window.__L=0; let last=performance.now()
  const t=()=>{const x=performance.now(); if(x-last>45) window.__L++; last=x; requestAnimationFrame(t)}; requestAnimationFrame(t) })
for (let i=0;i<130;i++){ await p.mouse.wheel(0,320); await p.waitForTimeout(60) }
console.log('long frames (>45ms) over a full wheel run:', await p.evaluate(()=>window.__L))
await b.close()
