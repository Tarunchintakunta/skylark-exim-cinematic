import { chromium } from 'playwright'
const URL = process.env.QA_URL ?? 'http://127.0.0.1:4173/'
const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

await page.evaluate(() => {
  window.__LT = []
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__LT.push({ n: e.name, d: Math.round(e.duration), t: Math.round(e.startTime) })
  }).observe({ entryTypes: ['longtask'] })
  window.__MARKS = []
})

// scroll the whole story
await page.evaluate(async () => {
  const max = document.body.scrollHeight - innerHeight
  const t0 = performance.now()
  while (performance.now() - t0 < 8000) {
    const t = (performance.now() - t0) / 8000
    window.scrollTo(0, Math.round(t * max))
    await new Promise((r) => requestAnimationFrame(r))
  }
})

const lt = await page.evaluate(() => window.__LT)
console.log(`long tasks: ${lt.length}, total blocked ${lt.reduce((a, x) => a + x.d, 0)}ms`)
console.log(lt.slice(0, 20).map((x) => `  ${x.d}ms @${x.t}`).join('\n'))
await b.close()
