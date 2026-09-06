import { chromium } from 'playwright'
const [chId, frac] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://127.0.0.1:4173/?qa=1', { waitUntil: 'networkidle' })
const c = await p.evaluate((id) => window.__SKYLARK_CHAPTERS__.find(x => x.id.startsWith(id)), chId)
await p.evaluate(([c, f]) => window.scrollTo(0, (c.start + (c.end - c.start) * f) * (document.body.scrollHeight - innerHeight)), [c, Number(frac)])
await p.waitForTimeout(3000)
console.log(await p.evaluate(() => {
  const { scene } = window.__SKYLARK_R3F__
  let vessel = null
  scene.traverse(o => { if (o.name === 'FishingVessel') vessel = o })
  if (!vessel) return 'no vessel'
  const rows = []
  vessel.traverse((o) => {
    if (!o.isMesh) return
    o.geometry.computeBoundingBox()
    const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)
    rows.push([o.name, bb.min.x, bb.max.x, bb.min.y, bb.max.y, bb.min.z, bb.max.z])
  })
  rows.sort((a, b) => a[1] - b[1])
  return rows.map(r => `${r[0].padEnd(20)} x[${r[1].toFixed(1)},${r[2].toFixed(1)}] y[${r[3].toFixed(1)},${r[4].toFixed(1)}] z[${r[5].toFixed(1)},${r[6].toFixed(1)}]`).join('\n')
}))
await b.close()
