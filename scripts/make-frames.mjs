/**
 * Explode each chapter clip into a scrub strip.
 *
 * The site draws one frame to a 2D canvas per scroll position, so the film has
 * to exist as frames, not as video: a <video> cannot be seeked accurately or
 * cheaply enough to follow a wheel. AVIF carries the full-resolution strip,
 * WebP is the fallback for browsers without it, and a tiny proxy strip loads
 * first so scrubbing works before the full strip has arrived.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'

const SRC = 'media-src/video'
const OUT = 'public/assets/frames'
const TMP = process.env.TMPDIR ?? '/tmp'

const D = { dir: 'd', w: 1440, h: 810, avifCrf: 46 }
const M = { dir: 'm', w: 960, h: 540, avifCrf: 48 }
// Every frame also gets a small WebP. It is the strip that loads first so
// scrubbing works immediately, and it is the whole strip for a browser without
// AVIF: soft, but it still moves frame by frame.
const SMALL_W = 640
const SMALL_Q = 42

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] })

// frames follow the chapter's scroll band: a longer band needs more of them
const WEIGHTS = JSON.parse(process.env.WEIGHTS ?? '{}')
const frameCount = (id, base) => {
  const w = WEIGHTS[id] ?? 1
  return Math.max(base, Math.min(Math.round(base * 1.6), Math.round(base * w)))
}

const clips = readdirSync(SRC).filter((f) => f.endsWith('.mp4')).sort()
const manifest = { proxyEvery: 1, desktop: { dir: `/assets/frames/${D.dir}`, w: D.w, h: D.h, clips: {} }, mobile: { dir: `/assets/frames/${M.dir}`, w: M.w, h: M.h, clips: {} } }

for (const file of clips) {
  const id = file.replace(/\.mp4$/, '')
  for (const P of [D, M]) {
    const n = frameCount(id, P === D ? 40 : 30)
    const outDir = path.join(OUT, P.dir, id)
    if (existsSync(outDir) && !process.env.FORCE) {
      const have = readdirSync(outDir).filter((f) => f.endsWith('.avif')).length
      if (have === n) {
        ;(P === D ? manifest.desktop : manifest.mobile).clips[id] = n
        continue
      }
    }
    rmSync(outDir, { recursive: true, force: true })
    mkdirSync(outDir, { recursive: true })

    const raw = path.join(TMP, `sk-${id}-${P.dir}`)
    rmSync(raw, { recursive: true, force: true })
    mkdirSync(raw, { recursive: true })
    // pick exactly n frames evenly across the clip
    run('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', path.join(SRC, file),
      '-vf', `scale=${P.w}:${P.h},fps=${n}/5`, '-frames:v', String(n), path.join(raw, '%04d.png')])

    const pngs = readdirSync(raw).filter((f) => f.endsWith('.png')).sort()
    let bytes = 0
    pngs.forEach((png, i) => {
      const nn = String(i + 1).padStart(4, '0')
      const src = path.join(raw, png)
      const avif = path.join(outDir, `${nn}.avif`)
      const webp = path.join(outDir, `${nn}.webp`)
      run('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', src,
        '-c:v', 'libsvtav1', '-crf', String(P.avifCrf), '-f', 'avif', avif])
      run('cwebp', ['-quiet', '-q', String(SMALL_Q), '-m', '4', '-resize',
        String(P === D ? SMALL_W : Math.round(SMALL_W * 0.7)), '0', src, '-o', webp])
      bytes += statSync(avif).size + statSync(webp).size
    })
    rmSync(raw, { recursive: true, force: true })
    ;(P === D ? manifest.desktop : manifest.mobile).clips[id] = pngs.length
    console.log(`${id} ${P.dir} ${pngs.length} frames ${(bytes / 1e6).toFixed(1)} MB`)
  }
}

writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify(manifest, null, 1))
console.log('wrote', path.join(OUT, 'frames.json'))
