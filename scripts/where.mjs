import { chromium } from 'playwright'
const [chId, frac, names] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://127.0.0.1:4173/?qa=1', { waitUntil: 'networkidle' })
const c = await p.evaluate((id) => window.__SKYLARK_CHAPTERS__.find(x => x.id.startsWith(id)), chId)
await p.evaluate(([c, f]) => window.scrollTo(0, (c.start + (c.end - c.start) * f) * (document.body.scrollHeight - innerHeight)), [c, Number(frac)])
await p.waitForTimeout(3000)
console.log(JSON.stringify(await p.evaluate((names) => {
  const { scene, camera } = window.__SKYLARK_R3F__
  const THREE = window.__SKYLARK_THREE__
  const want = names.split(',')
  const out = []
  scene.traverse((o) => {
    if (!want.some(w => o.name === w || o.name.startsWith(w))) return
    const v = new o.position.constructor()
    o.getWorldPosition(v)
    out.push({ name: o.name, world: [v.x, v.y, v.z].map(n => +n.toFixed(2)) })
  })
  return { camera: camera.position.toArray().map(n => +n.toFixed(2)), out: out.slice(0, 40) }
}, names), null, 1))
await b.close()
