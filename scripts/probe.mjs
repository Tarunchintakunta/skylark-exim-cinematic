import { chromium } from 'playwright'
const [chId, frac, xs, ys] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://127.0.0.1:4173/?qa=1', { waitUntil: 'networkidle' })
const c = await p.evaluate((id) => window.__SKYLARK_CHAPTERS__.find(x => x.id.startsWith(id)), chId)
await p.evaluate(([c, f]) => window.scrollTo(0, (c.start + (c.end - c.start) * f) * (document.body.scrollHeight - innerHeight)), [c, Number(frac)])
await p.waitForTimeout(3000)
const out = await p.evaluate(([xs, ys]) => {
  const store = window.__SKYLARK_R3F__
  if (!store) return { error: 'no r3f store' }
  const { scene, camera, raycaster } = store
  const res = []
  for (const s of xs.split(';')) {
    const [x, y] = s.split(',').map(Number)
    raycaster.setFromCamera({ x: (x / 1440) * 2 - 1, y: -(y / 900) * 2 + 1 }, camera)
    const hits = raycaster.intersectObjects(scene.children, true).slice(0, 3)
    res.push({
      at: [x, y],
      hits: hits.map(h => {
        const names = []
        let o = h.object
        while (o) { if (o.name) names.push(o.name); o = o.parent }
        return { d: +h.distance.toFixed(2), name: h.object.name || '(unnamed)', chain: names.slice(0, 5).join(' < '), mat: h.object.material?.color?.getHexString?.() }
      }),
    })
  }
  return { camera: camera.position.toArray().map(v => +v.toFixed(2)), res }
}, [xs, ys])
console.log(JSON.stringify(out, null, 1))
await b.close()
