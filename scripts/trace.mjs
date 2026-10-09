/**
 * First-visit performance trace of a full-page scroll.
 *
 * Cold cache, a fresh browser context, then a steady wheel scroll from the top
 * of the story to the bottom while a Chrome trace records. Reports what the
 * acceptance criteria are written against:
 *
 *   - long tasks over 50 ms on the main thread (PerformanceObserver)
 *   - frame times and dropped frames, from a rAF probe (a frame is "dropped"
 *     for every vsync it overran)
 *   - image decode time from the trace, split main thread vs everything else
 *   - bytes transferred, total and by kind
 *   - blank canvas frames after each Navigation jump
 *
 *   PROFILE=desktop|laptop|mobile
 *       desktop = 1440x900, no throttling
 *       laptop  = 1440x900, 4x CPU, 30 Mbit/s and 40 ms: a mid-range laptop on home broadband
 *       mobile  = 390x844 @3x, touch, 4x CPU, Fast 4G
 *   LABEL=before|after       names the JSON written to qa/perf/
 *   QA_URL                   defaults to the preview server
 *
 * Headless Chrome composites in software, so absolute frame rates here are
 * pessimistic next to a real GPU; compare runs of this script with each other.
 */
import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import readline from 'node:readline'

const URL = process.env.QA_URL ?? 'http://127.0.0.1:4173/'
const PROFILE = process.env.PROFILE ?? 'desktop'
const LABEL = process.env.LABEL ?? 'run'
const mobile = PROFILE === 'mobile'
// scroll the whole page in this many seconds: a steady reading pace
const SECONDS = Number(process.env.SECONDS ?? (mobile ? 45 : 40))

// the new headless mode gets the real GPU; the old one falls back to SwiftShader
const browser = await chromium.launch({ channel: 'chromium' })
const ctx = await browser.newContext(
  mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
)
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Network.enable')
await cdp.send('Network.setCacheDisabled', { cacheDisabled: false })
if (PROFILE === 'laptop') {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 40,
    downloadThroughput: (30 * 1024 * 1024) / 8, uploadThroughput: (5 * 1024 * 1024) / 8,
  })
}
if (mobile) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  // DevTools "Fast 4G"
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150,
    downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8,
  })
}

const reqs = new Map()
let bytes = 0
const byKind = {}
const kindOf = (u) =>
  /\/frames\//.test(u) ? 'frames' : /\/stills\//.test(u) ? 'posters' : /\.glb/.test(u) ? 'models'
    : /\.(js|css)/.test(u) ? 'code' : /fonts/.test(u) ? 'fonts' : 'other'
cdp.on('Network.requestWillBeSent', (e) => reqs.set(e.requestId, e.request.url))
cdp.on('Network.loadingFinished', (e) => {
  bytes += e.encodedDataLength
  const k = kindOf(reqs.get(e.requestId) ?? '')
  byKind[k] = (byKind[k] ?? 0) + e.encodedDataLength
})
const fetched = new Set()
cdp.on('Network.requestWillBeSent', (e) => fetched.add(e.request.url))

const t0 = Date.now()
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.loader.done', { timeout: 30000 }).catch(() => {})
const loaderMs = Date.now() - t0
await page.waitForTimeout(1500)

await page.evaluate(() => {
  window.__P = { lt: [], frames: [], blank: 0, samples: 0 }
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__P.lt.push(Math.round(e.duration))
  }).observe({ type: 'longtask', buffered: false })
  let last = performance.now()
  const cv = document.querySelector('.film-canvas')
  const g = cv?.getContext('2d')
  let n = 0
  const tick = () => {
    const now = performance.now()
    window.__P.frames.push(now - last)
    last = now
    // every 4th frame, is the visible film canvas black?
    if (g && ++n % 4 === 0 && cv.style.visibility !== 'hidden' && !window.__P.paused) {
      window.__P.samples++
      const d = g.getImageData(cv.width / 2 - 4, cv.height / 2 - 4, 8, 8).data
      let s = 0
      for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]
      if (s === 0) window.__P.blank++
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})

const TRACE = `qa/perf/${LABEL}-${PROFILE}.trace.json`
await fs.mkdir('qa/perf', { recursive: true })
await browser.startTracing(page, {
  path: TRACE,
  categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel'],
})

// the scroll: real wheel events on desktop so Lenis runs, finger swipes on mobile
const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
const STEP_MS = 50
const steps = Math.round((SECONDS * 1000) / STEP_MS)
const px = max / steps
if (mobile) {
  // touch scrolling is native; drive scrollTop at the same steady pace a swipe gives
  await page.evaluate(async ({ steps, px, STEP_MS }) => {
    for (let i = 1; i <= steps; i++) {
      window.scrollTo(0, Math.round(i * px))
      await new Promise((r) => setTimeout(r, STEP_MS))
    }
  }, { steps, px, STEP_MS })
} else {
  await page.mouse.move(720, 450)
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, px)
    await page.waitForTimeout(STEP_MS)
  }
}
await page.waitForTimeout(1200)
await browser.stopTracing()

const film = await page.evaluate(() => ({ ...window.__FILM_STATS__ }))
const scroll = await page.evaluate(() => {
  const f = window.__P.frames.slice(5)
  const sorted = [...f].sort((a, b) => a - b)
  const q = (x) => +sorted[Math.floor(sorted.length * x)].toFixed(1)
  const vsync = 1000 / 60
  const dropped = f.reduce((a, dt) => a + Math.max(0, Math.round(dt / vsync) - 1), 0)
  const dur = f.reduce((a, b) => a + b, 0)
  return {
    frames: f.length, fps: +((f.length / dur) * 1000).toFixed(1), p50: q(0.5), p95: q(0.95), p99: q(0.99),
    worst: Math.round(sorted.at(-1)), droppedFrames: dropped, droppedPct: +((dropped / (dropped + f.length)) * 100).toFixed(1),
    longTasks: window.__P.lt.length, longTaskMs: window.__P.lt, blankSamples: window.__P.blank, canvasSamples: window.__P.samples,
  }
})

// Navigation jumps: click every chapter link from wherever we are, and count
// frames on which the visible film canvas is black
const nav = await page.evaluate(async () => {
  const cv = document.querySelector('.film-canvas')
  const g = cv.getContext('2d')
  const buttons = [...document.querySelectorAll('.rail button')]
  const out = { jumps: 0, blankFrames: 0, frames: 0 }
  window.__P.paused = true
  for (const order of [buttons.slice().reverse(), buttons]) {
    for (const b of order) {
      b.click()
      out.jumps++
      const t = performance.now()
      while (performance.now() - t < 1400) {
        await new Promise((r) => requestAnimationFrame(r))
        if (cv.style.visibility === 'hidden' || +cv.style.opacity < 0.5) continue
        out.frames++
        const d = g.getImageData(cv.width / 2 - 4, cv.height / 2 - 4, 8, 8).data
        let s = 0
        for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]
        if (s === 0) out.blankFrames++
      }
    }
  }
  return out
})

// decode time from the trace, main thread against everything else
// a full scroll's trace runs to hundreds of MB: read it an event per line
const events = []
const rl = readline.createInterface({ input: createReadStream(TRACE) })
for await (const line of rl) {
  const t = line.trim().replace(/^\{"traceEvents":\[/, '').replace(/,$/, '')
  if (!t.startsWith('{"') || !/"ph":"[XM]"/.test(t)) continue
  if (!/thread_name|Decode|ImageBitmap|"RunTask"/.test(t)) continue
  try { events.push(JSON.parse(t)) } catch {}
}
await fs.rm(TRACE)
const threads = new Map()
for (const e of events) if (e.ph === 'M' && e.name === 'thread_name') threads.set(`${e.pid}:${e.tid}`, e.args.name)
const decode = { mainMs: 0, offMainMs: 0, count: 0, longestMainMs: 0 }
let mainLong = 0
for (const e of events) {
  if (e.ph !== 'X' || !e.dur) continue
  const th = threads.get(`${e.pid}:${e.tid}`) ?? ''
  const isMain = th === 'CrRendererMain'
  if (/Decode Image|ImageDecodeTask|Decode LazyPixelRef|ImageBitmap/.test(e.name)) {
    const ms = e.dur / 1000
    decode.count++
    if (isMain) {
      decode.mainMs += ms
      decode.longestMainMs = Math.max(decode.longestMainMs, ms)
    } else decode.offMainMs += ms
  }
  if (isMain && e.name === 'RunTask' && e.dur > 50000) mainLong++
}
decode.mainMs = Math.round(decode.mainMs)
decode.offMainMs = Math.round(decode.offMainMs)
decode.longestMainMs = Math.round(decode.longestMainMs)

const result = {
  label: LABEL, profile: PROFILE, url: URL, loaderMs, scrollSeconds: SECONDS,
  scroll, paintedFrames: film, traceLongTasks: mainLong, decode, nav,
  transferredMB: +(bytes / 1e6).toFixed(2),
  byKindMB: Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, +(v / 1e6).toFixed(2)])),
  requests: fetched.size,
  fetchedCollectorOrQa: [...fetched].filter((u) => /collector|\/qa\//.test(u)),
  fetchedModels: [...fetched].filter((u) => /\.glb/.test(u)).map((u) => u.split('/').pop()),
}
await fs.writeFile(`qa/perf/${LABEL}-${PROFILE}.json`, JSON.stringify(result, null, 1))
console.log(JSON.stringify(result, null, 1))
await browser.close()
