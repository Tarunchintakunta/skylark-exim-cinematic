import { chromium } from 'playwright'
import path from 'node:path'
const BASE = process.env.QA_URL ?? 'http://127.0.0.1:4173/'
const b = await chromium.launch({ args: ['--use-gl=angle','--enable-unsafe-swiftshader'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
p.on('console', m => { if (m.type()==='error') console.log('ERR', m.text().slice(0,180)) })
await p.goto(BASE + '?qa=1', { waitUntil: 'networkidle' })
await p.waitForTimeout(6500)
const chs = await p.evaluate(() => window.__SKYLARK_CHAPTERS__)
const c = chs.find(x => x.num === (process.env.CH ?? '04'))
const fracs = (process.env.FRACS ?? '0.30,0.55,0.80').split(',').map(Number)
for (const f of fracs) {
  const t = c.start + (c.end - c.start) * f
  await p.evaluate(async (tp) => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo(0, Math.round(tp*max)); await new Promise(r=>setTimeout(r,120))
    window.scrollTo(0, Math.round(tp*max)); await new Promise(r=>setTimeout(r,2600))
  }, t)
  const out = path.resolve(`qa/shots/aerial-ch${c.num}-${String(f).replace('.','')}.png`)
  await p.screenshot({ path: out })
  console.log('shot', out)
}
await b.close()
