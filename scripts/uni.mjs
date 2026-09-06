import { chromium } from 'playwright'
const [chId, frac] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://127.0.0.1:4173/?qa=1', { waitUntil: 'networkidle' })
const c = await p.evaluate((id) => window.__SKYLARK_CHAPTERS__.find(x => x.id.startsWith(id)), chId)
await p.evaluate(([c, f]) => window.scrollTo(0, (c.start + (c.end - c.start) * f) * (document.body.scrollHeight - innerHeight)), [c, Number(frac)])
await p.waitForTimeout(3000)
console.log(JSON.stringify(await p.evaluate(() => {
  const { scene, camera } = window.__SKYLARK_R3F__
  let out = null
  scene.traverse(o => {
    if (out || !o.isMesh || !o.material?.uniforms?.uDepthBias) return
    const u = o.material.uniforms
    out = { depthBias: +u.uDepthBias.value.toFixed(3), swell: +u.uSwell.value.toFixed(3), haze: u.uHaze.value }
  })
  // sample the middle of the canvas
  const cv = document.querySelector('canvas')
  return { ...out, cam: camera.position.toArray().map(n => +n.toFixed(1)), canvas: [cv.width, cv.height] }
}), null, 1))
await b.close()
