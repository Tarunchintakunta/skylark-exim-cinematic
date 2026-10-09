/**
 * Explode each chapter clip into a scrub strip, and encode the posters.
 *
 *   node scripts/make-frames.mjs            regenerate everything
 *   ONLY=c03-voyage node scripts/...        one clip
 *
 * The site draws one frame to a 2D canvas per scroll position, so the film has
 * to exist as frames, not as video: a <video> cannot be seeked accurately or
 * cheaply enough to follow a wheel (scripts/video-bench.mjs measures it).
 *
 * Two sets, both with a full frame and a proxy per position:
 *
 *   d/  1600x900. Full frames are AVIF, proxies 640x360 WebP. AVIF stays
 *       because it was measured, not assumed: at 1600x900 it decodes in the
 *       same ~5 ms as WebP q72 (off the main thread either way) and is a third
 *       smaller at the same SSIM. On a first visit the frame that arrives late
 *       is late because of bytes, not decode.
 *   m/  720x900, the centre of the same 1600x900 frame. A portrait viewport
 *       covers a 16:9 frame by its height, so it only ever shows a centre
 *       slice: at 390x844 that is 416 of the 1600 columns. Shipping the slice
 *       alone is the same picture for a fraction of the bytes. FilmStrip only
 *       picks this set when the viewport is at most 0.8 wide for its height,
 *       which is exactly when the slice holds everything visible.
 *
 * Frame counts are about a third lower than the 1080p cut (40 to 60 a clip):
 * 26 to 36 is enough at this scroll length, and every frame cut is one fewer
 * request. Mobile carries three quarters of the desktop count.
 *
 * Posters come from the original stills in media-src/stills, as WebP at the
 * frame size of each set.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync, readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'

const SRC = 'media-src/video'
const STILLS = 'media-src/stills'
const OUT = 'public/assets/frames'
const POSTERS = 'public/assets/media/higgsfield/stills'
const TMP = path.join(os.tmpdir(), 'skylark-frames')

const W = 1600
const H = 900
// Quality is chosen per clip: start at the top, step down until the clip's
// average frame fits its budget. Calm shots keep the higher setting; the busy
// water and nets step down. Even the floor (AVIF q28, SSIM ~0.89 against the
// source) measured sharper than the 1080p cut it replaces (~0.88).
const D = { dir: 'd', w: W, h: H, crop: null, proxyW: 640, proxyH: 360, fullKB: 45, proxyKB: 13 }
const M = { dir: 'm', w: 720, h: H, crop: { left: (W - 720) / 2, top: 0, width: 720, height: H }, proxyW: 288, proxyH: 360, fullKB: 24, proxyKB: 7 }
const FULL_Q = [36, 28]
const PROXY_Q = [32, 20]
// proxies are loaded for every other frame; the frame between draws its
// neighbour's proxy until the sharp one lands
const PROXY_EVERY = 2
// posters start here and step down until they fit their budget
const POSTER_Q = 64
const POSTER_KB = { d: 120, m: 60 }

// desktop frames per clip, about two thirds of the 1080p cut; longer scroll
// bands keep more
const COUNTS = {
  'c01-port': 34, 'c02-boarding': 28, 'c03-voyage': 36, 'c04-nets': 36, 'c05-catch': 36,
  'c06-hold': 28, 'c07-return': 28, 'c07-transfer': 28, 'c08-intake': 28, 'c09-cutting': 32,
  'c10-ponds': 32, 'c11-forms': 28, 'c11-shrimp': 28, 'c12-qc': 34, 'c13-freezing': 32,
  'c14-coldstore': 30, 'c15-reefer': 34, 'c16-vessel': 30,
}
const mobileCount = (n) => Math.round(n * 0.75)

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] })

const manifestPath = path.join(OUT, 'frames.json')
const manifest = existsSync(manifestPath) && process.env.ONLY
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : { desktop: { clips: {} }, mobile: { clips: {} } }
manifest.proxyEvery = PROXY_EVERY
manifest.desktop = { dir: `/assets/frames/${D.dir}`, w: D.w, h: D.h, clips: manifest.desktop.clips }
manifest.mobile = { dir: `/assets/frames/${M.dir}`, w: M.w, h: M.h, clips: manifest.mobile.clips }

const clips = readdirSync(SRC)
  .filter((f) => f.endsWith('.mp4'))
  .map((f) => f.replace(/\.mp4$/, ''))
  .filter((id) => !process.env.ONLY || id === process.env.ONLY)
  .sort()

const kb = (files) => (files.reduce((a, f) => a + statSync(f).size, 0) / files.length / 1024).toFixed(1)

for (const id of clips) {
  const nD = COUNTS[id]
  if (!nD) throw new Error(`no frame count for ${id}`)
  for (const P of [D, M]) {
    const n = P === D ? nD : mobileCount(nD)
    const outDir = path.join(OUT, P.dir, id)
    rmSync(outDir, { recursive: true, force: true })
    mkdirSync(outDir, { recursive: true })

    const raw = path.join(TMP, `${id}-${P.dir}`)
    rmSync(raw, { recursive: true, force: true })
    mkdirSync(raw, { recursive: true })
    // exactly n frames evenly across the five-second clip, at the desktop size
    run('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', path.join(SRC, `${id}.mp4`),
      '-vf', `scale=${W}:${H}:flags=lanczos,fps=${n}/5`, '-frames:v', String(n), path.join(raw, '%04d.png')])

    const pngs = readdirSync(raw).filter((f) => f.endsWith('.png')).sort()
    const src = (png) => (P.crop ? sharp(path.join(raw, png)).extract(P.crop) : sharp(path.join(raw, png)))
    const fit = async (ext, [hi, lo], budgetKB, enc) => {
      for (let q = hi; ; q -= 4) {
        const bufs = await Promise.all(pngs.map((png) => enc(src(png), q).toBuffer()))
        const avg = bufs.reduce((a, b) => a + b.length, 0) / bufs.length / 1024
        if (avg <= budgetKB || q - 4 < lo) {
          bufs.forEach((b, i) => writeFileSync(path.join(outDir, `${String(i + 1).padStart(4, '0')}.${ext}`), b))
          return `${avg.toFixed(1)} KB q${q}`
        }
      }
    }
    const full = await fit('avif', FULL_Q, P.fullKB, (s, q) => s.avif({ quality: q, effort: 4 }))
    const proxy = await fit('webp', PROXY_Q, P.proxyKB, (s, q) => s.resize(P.proxyW, P.proxyH).webp({ quality: q, effort: 6 }))
    rmSync(raw, { recursive: true, force: true })
    manifest[P === D ? 'desktop' : 'mobile'].clips[id] = pngs.length
    console.log(`${id.padEnd(14)} ${P.dir} ${String(pngs.length).padStart(2)} frames  full ${full}  proxy ${proxy}`)
  }

  // Posters: the original still, cover-cropped to each set's frame. AVIF is
  // what gets drawn; the WebP twin is for a browser without AVIF and is
  // allowed over budget on the busiest water, since it is rarely fetched.
  mkdirSync(path.join(POSTERS, 'm'), { recursive: true })
  const still = path.join(STILLS, `${id}.png`)
  const poster = async (out, crop, budget, fmt) => {
    for (let q = POSTER_Q; ; q -= 4) {
      const img = sharp(still).resize(W, H, { fit: 'cover' })
      const buf = await (crop ? img.extract(crop) : img)[fmt]({ quality: q, effort: fmt === 'avif' ? 4 : 6 }).toBuffer()
      if (buf.length <= budget * 1024 || q <= 28) return writeFileSync(out, buf)
    }
  }
  const made = []
  for (const fmt of ['avif', 'webp']) {
    const d = path.join(POSTERS, `${id}.${fmt}`)
    const m = path.join(POSTERS, 'm', `${id}.${fmt}`)
    await poster(d, null, POSTER_KB.d, fmt)
    await poster(m, M.crop, POSTER_KB.m, fmt)
    made.push(`${fmt} d ${kb([d])} KB m ${kb([m])} KB`)
  }
  console.log(`${id.padEnd(14)} posters  ${made.join('  ')}`)
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n')
console.log('wrote', manifestPath)
