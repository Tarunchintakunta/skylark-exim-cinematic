import { chromium } from 'playwright'
const [chId, frac, root] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://127.0.0.1:4173/?qa=1', { waitUntil: 'networkidle' })
const c = await p.evaluate((id) => window.__SKYLARK_CHAPTERS__.find(x => x.id.startsWith(id)), chId)
await p.evaluate(([c, f]) => window.scrollTo(0, (c.start + (c.end - c.start) * f) * (document.body.scrollHeight - innerHeight)), [c, Number(frac)])
await p.waitForTimeout(3000)
console.log(await p.evaluate((root) => {
  const { scene } = window.__SKYLARK_R3F__
  let g = null
  scene.traverse(o => { if (o.name === root) g = o })
  if (!g) return 'not found'
  const rows = []
  g.traverse((o) => {
    if (!o.isMesh) return
    o.geometry.computeBoundingBox()
    const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)
    rows.push(`${o.name.padEnd(26)} x[${bb.min.x.toFixed(1)},${bb.max.x.toFixed(1)}] y[${bb.min.y.toFixed(1)},${bb.max.y.toFixed(1)}] z[${bb.min.z.toFixed(1)},${bb.max.z.toFixed(1)}]`)
  })
  return rows.join('\n')
}, root))
await b.close()
