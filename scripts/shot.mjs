import { chromium } from 'playwright'
const [chId, frac, out, w, h] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: Number(w ?? 1440), height: Number(h ?? 900) } })
await p.goto('http://127.0.0.1:4173/?qa=1', { waitUntil: 'networkidle' })
if (chId !== 'top') {
  const c = await p.evaluate((id) => window.__SKYLARK_CHAPTERS__.find(x => x.id.startsWith(id)), chId)
  await p.evaluate(([c, f]) => window.scrollTo(0, (c.start + (c.end - c.start) * f) * (document.body.scrollHeight - innerHeight)), [c, Number(frac)])
}
await p.waitForTimeout(3500)
await p.screenshot({ path: out })
await b.close()
