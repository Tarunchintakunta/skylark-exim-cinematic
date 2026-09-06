import { chromium } from 'playwright'

const URL = process.env.QA_URL ?? 'http://127.0.0.1:4173/'
const b = await chromium.launch()
const scale = Number(process.env.DPR ?? 1)
const page = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: scale })
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

const inventory = await page.evaluate(() => {
  const vids = [...document.querySelectorAll('video')]
  return {
    dpr: window.devicePixelRatio,
    canvases: [...document.querySelectorAll('canvas')].map((c) => `${c.width}x${c.height}`),
    plateEls: document.querySelectorAll('.plate').length,
    videoEls: vids.length,
    videosPlaying: vids.filter((v) => !v.paused).length,
    videosDecoding: vids.filter((v) => v.readyState >= 2).length,
    willChange: [...document.querySelectorAll('*')].filter(
      (e) => getComputedStyle(e).willChange !== 'auto',
    ).length,
    backdrop: [...document.querySelectorAll('*')].filter(
      (e) => getComputedStyle(e).backdropFilter !== 'none',
    ).length,
  }
})

// frame times while scrolling steadily, the way a visitor actually reads it
const frames = await page.evaluate(async () => {
  const out = []
  let last = performance.now()
  let raf = 0
  const tick = () => {
    const now = performance.now()
    out.push(now - last)
    last = now
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  const max = document.body.scrollHeight - innerHeight
  const t0 = performance.now()
  // eight seconds of continuous scrolling across the whole story
  while (performance.now() - t0 < 8000) {
    const t = (performance.now() - t0) / 8000
    window.scrollTo(0, Math.round(t * max))
    await new Promise((r) => requestAnimationFrame(r))
  }
  cancelAnimationFrame(raf)
  return out.slice(3)
})

frames.sort((a, b) => a - b)
const pct = (p) => frames[Math.floor(frames.length * p)]
const mean = frames.reduce((a, b) => a + b, 0) / frames.length
console.log(JSON.stringify(inventory, null, 1))
console.log(
  `frames=${frames.length} mean=${mean.toFixed(1)}ms (${(1000 / mean).toFixed(0)}fps) ` +
    `p50=${pct(0.5).toFixed(1)} p90=${pct(0.9).toFixed(1)} p99=${pct(0.99).toFixed(1)} worst=${frames.at(-1).toFixed(0)}ms`,
)
console.log(`janky frames over 32ms: ${frames.filter((f) => f > 32).length}`)
await b.close()
