/**
 * The user's complaint is "it gets stuck while scrolling", on a deployed site.
 * Locally every frame is already cached, so the honest reproduction is a
 * throttled connection. Scroll steadily and sample the canvas: if the picture
 * is identical between samples while the scroll is still moving, the film is
 * frozen. Reports the share of samples that were frozen, on both builds.
 */
import { chromium } from 'playwright'
const base = process.env.QA_URL ?? 'http://127.0.0.1:4173/'
const b = await chromium.launch({ headless: false })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const cdp = await p.context().newCDPSession(p)
await cdp.send('Network.enable')
await cdp.send('Network.emulateNetworkConditions', {
  offline: false, latency: 90,
  downloadThroughput: (6 * 1024 * 1024) / 8,   // 6 Mbps, an ordinary connection
  uploadThroughput: (1 * 1024 * 1024) / 8,
})
const SPAN = Number(process.env.SPAN ?? 0.86)
await p.goto(base + '?qa=1', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(6000)

const r = await p.evaluate(async (SPAN) => {
  const cv = document.querySelector('.film-canvas')
  const g = cv.getContext('2d', { willReadFrequently: true })
  const max = document.documentElement.scrollHeight - innerHeight
  let frozen = 0, total = 0, prev = null; const where = []
  for (let i = 0; i < 150; i++) {
    window.scrollTo(0, (i / 150) * max * SPAN)
    await new Promise((r) => setTimeout(r, 110))
    const d = g.getImageData(cv.width * 0.35, cv.height * 0.5, 8, 8).data
    const sig = Array.from(d).join(',')
    if (prev !== null) {
      total++
      if (sig === prev) {
        frozen++
        const pct = window.scrollY / max
        const ch = (window.__SKYLARK_CHAPTERS__ ?? []).filter((c) => pct >= c.start).pop()
        where.push(ch?.id ?? '?')
      }
    }
    prev = sig
  }
  const by = {}
  for (const w of where) by[w] = (by[w] ?? 0) + 1
  return { frozen, total, pct: Math.round((frozen / total) * 100), by }
}, SPAN)
console.log(`frozen samples while scrolling: ${r.frozen}/${r.total}  (${r.pct}% of the scroll showed a stuck frame)`)
for (const [k, v] of Object.entries(r.by).sort((a,b)=>b[1]-a[1])) console.log(`   ${k.padEnd(16)} ${v}`)
await b.close()
