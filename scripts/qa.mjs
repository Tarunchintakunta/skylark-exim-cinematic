import { chromium, devices } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const BASE = (process.env.QA_URL ?? 'http://127.0.0.1:5173/') + '?qa=1'
const OUT = path.resolve('qa/shots')

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'wide-1920x1080', width: 1920, height: 1080 },
  { name: 'tablet-834x1194', width: 834, height: 1194 },
  { name: 'mobile-390x844', width: 390, height: 844, mobile: true },
]

// scroll stops, one per chapter plus the hero hold
const STOPS = [
  ['01-port', 0.005], ['02-boarding', 0.055], ['03-compass', 0.105],
  ['04-bay', 0.16], ['05-nets', 0.215], ['06-catch', 0.265],
  ['07-hold', 0.325], ['08-return', 0.372], ['09-transfer', 0.412],
  ['10-plant', 0.452], ['11-cutting', 0.492], ['12-ponds', 0.54],
  ['13-forms', 0.592], ['14-grading', 0.638], ['15-qc', 0.70],
  ['16-freezing', 0.762], ['17-coldstore', 0.812], ['18-documents', 0.856],
  ['19-reefer', 0.898], ['20-vessel', 0.94], ['21-globe', 0.975], ['22-rfq', 0.998],
]

const REQUIRED_TERMS = [
  'Skylark Exim', 'Two Origins. One Standard.', 'Bay of Bengal', 'Visakhapatnam',
  'Andhra', 'Swordfish', 'Tuna', 'Shrimp', 'HOSO', 'HLSO', 'PUD', 'PTO',
  '10/20', '21/25', '26/30', '31/40', '41/50', 'HACCP', 'EIC',
  'Nitrofurans', 'Chloramphenicol', 'Tetracyclines', 'EU and US',
  'IQF', 'Block freezing', 'Blast freezing', 'glaze', '700 pallets',
  'Health certificate', 'Packing list', 'Certificate of origin',
  'Residue certificate', 'Compliance records', 'Reefer', 'Request export quote',
]

const setProgress = async (page, p) =>
  page.evaluate(async (target) => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo(0, Math.round(target * max))
    await new Promise((r) => setTimeout(r, 90))
    window.scrollTo(0, Math.round(target * max))
    await new Promise((r) => setTimeout(r, 1500))
  }, p)

const canvasStats = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return { ok: false, reason: 'no canvas' }
    const w = 160, h = 90
    const off = document.createElement('canvas')
    off.width = w; off.height = h
    const ctx = off.getContext('2d')
    ctx.drawImage(c, 0, 0, w, h)
    const d = ctx.getImageData(0, 0, w, h).data
    let min = 255, max = 0, sum = 0
    const buckets = new Set()
    for (let i = 0; i < d.length; i += 4) {
      const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114)
      min = Math.min(min, l); max = Math.max(max, l); sum += l
      buckets.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`)
    }
    const mean = sum / (d.length / 4)
    return { ok: true, min: Math.round(min), max: Math.round(max), mean: Math.round(mean), colours: buckets.size, range: Math.round(max - min) }
  })

const overlapCheck = (page) =>
  page.evaluate(() => {
    const sel = ['.chapter-copy', '.hero-mark', '.hud', '.rfq', '.topbar', '.rail']
    const boxes = []
    for (const s of sel) {
      document.querySelectorAll(s).forEach((el) => {
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.25) return
        const r = el.getBoundingClientRect()
        if (r.width < 8 || r.height < 8) return
        if (r.bottom < 0 || r.top > window.innerHeight) return
        boxes.push({ s, x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom })
      })
    }
    const hits = []
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j]
        const ox = Math.max(0, Math.min(a.r, b.r) - Math.max(a.x, b.x))
        const oy = Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y))
        const area = ox * oy
        const small = Math.min(a.w * a.h, b.w * b.h)
        if (area > small * 0.14) hits.push(`${a.s} x ${b.s} (${Math.round((area / small) * 100)}%)`)
      }
    const overflowX = document.documentElement.scrollWidth > window.innerWidth + 2
    return { hits, overflowX, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth }
  })

const run = async () => {
  await fs.mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const report = { base: BASE, when: new Date().toISOString(), viewports: [], errors: [], terms: {}, verdict: 'unknown' }

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      ...(vp.mobile ? devices['iPhone 13'] : {}),
      ...(vp.mobile ? { viewport: { width: vp.width, height: vp.height }, isMobile: true, hasTouch: true } : {}),
    })
    const page = await ctx.newPage()
    const consoleErrors = []
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300))
    })
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 300)))
    const failedReq = []
    page.on('requestfailed', (r) => failedReq.push(`${r.url()} ${r.failure()?.errorText ?? ''}`))
    page.on('response', (r) => {
      if (r.status() >= 400) failedReq.push(`${r.status()} ${r.url()}`)
    })

    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 })
    await page.waitForTimeout(6500)

    // land every stop on the real middle of its chapter
    const live = await page.evaluate(() => window.__SKYLARK_CHAPTERS__ ?? null)
    const chapterStops = live
      ? live.map((c) => [`${c.num}-${c.nav.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, c.start + (c.end - c.start) * 0.5])
      : STOPS

    const vRep = { name: vp.name, stops: [], consoleErrors: [], failedReq: [] }
    const dir = path.join(OUT, vp.name)
    await fs.mkdir(dir, { recursive: true })

    const stops =
      vp.name === 'desktop-1440x900'
        ? chapterStops
        : chapterStops.filter((_, i) => i % 3 === 0 || i === chapterStops.length - 1)

    for (const [label, p] of stops) {
      await setProgress(page, p)
      const stats = await canvasStats(page)
      const overlap = await overlapCheck(page)
      const shot = path.join(dir, `${label}.png`)
      await page.screenshot({ path: shot })
      vRep.stops.push({ label, p, stats, overlap: overlap.hits, overflowX: overlap.overflowX, shot: path.relative(process.cwd(), shot) })
    }

    // full DOM text for business QA (desktop only, all copy is rendered at all times)
    if (vp.name === 'desktop-1440x900') {
      const text = await page.evaluate(() => document.body.innerText + ' ' + document.body.textContent)
      REQUIRED_TERMS.forEach((t) => {
        report.terms[t] = text.toLowerCase().includes(t.toLowerCase())
      })
      // RFQ interaction test
      await setProgress(page, 0.995)
      await page.waitForTimeout(1200)
      const rfq = { visible: await page.locator('.rfq').isVisible().catch(() => false) }
      try {
        await page.locator('.submit').click({ timeout: 4000 })
        await page.waitForTimeout(700)
        rfq.blockedEmpty = (await page.locator('.field .err').count()) > 0
        await page.locator('label.chip', { hasText: 'Swordfish' }).first().click()
        await page.locator('#grade').selectOption({ index: 1 })
        await page.fill('#market', 'Rotterdam')
        await page.fill('#quantity', '2 x 40ft reefer / month')
        await page.locator('#packaging').selectOption({ index: 1 })
        await page.fill('#name', 'QA Buyer')
        await page.fill('#company', 'QA Imports BV')
        await page.fill('#email', 'buyer@example.com')
        await page.waitForTimeout(300)
        rfq.errorsAfterFill = await page.locator('.field .err').count()
        await page.screenshot({ path: path.join(dir, '22-rfq-filled.png') })
      } catch (e) {
        rfq.error = String(e).slice(0, 200)
      }
      report.rfq = rfq
    }

    vRep.consoleErrors = [...new Set(consoleErrors)].slice(0, 12)
    vRep.failedReq = [...new Set(failedReq)].slice(0, 12)
    report.viewports.push(vRep)
    await ctx.close()
  }

  await browser.close()

  const blanks = []
  const overlaps = []
  report.viewports.forEach((v) =>
    v.stops.forEach((s) => {
      if (!s.stats.ok || s.stats.range < 12 || s.stats.colours < 6)
        blanks.push(`${v.name}/${s.label} range=${s.stats.range} colours=${s.stats.colours}`)
      if (s.overlap.length) overlaps.push(`${v.name}/${s.label}: ${s.overlap.join('; ')}`)
      if (s.overflowX) overlaps.push(`${v.name}/${s.label}: horizontal overflow`)
    }),
  )
  const missingTerms = Object.entries(report.terms).filter(([, v]) => !v).map(([k]) => k)
  const errs = report.viewports.flatMap((v) => v.consoleErrors)
  const reqs = report.viewports.flatMap((v) => v.failedReq)

  report.summary = { blanks, overlaps, missingTerms, consoleErrors: [...new Set(errs)], failedRequests: [...new Set(reqs)] }
  report.verdict =
    blanks.length === 0 && overlaps.length === 0 && missingTerms.length === 0 && reqs.length === 0
      ? 'PASS'
      : 'ISSUES'

  await fs.writeFile('qa/report.json', JSON.stringify(report, null, 2))
  console.log('VERDICT:', report.verdict)
  console.log('blank canvas :', blanks.length ? blanks : 'none')
  console.log('overlaps     :', overlaps.length ? overlaps : 'none')
  console.log('missing terms:', missingTerms.length ? missingTerms : 'none')
  console.log('failed reqs  :', reqs.length ? [...new Set(reqs)].slice(0, 10) : 'none')
  console.log('console errs :', errs.length ? [...new Set(errs)].slice(0, 8) : 'none')
  console.log('rfq          :', JSON.stringify(report.rfq))
}

run().catch((e) => {
  console.error('QA FAILED', e)
  process.exit(1)
})
