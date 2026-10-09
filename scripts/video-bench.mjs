/**
 * Strips or video? Scrub one chapter both ways and compare.
 *
 *   node scripts/video-bench.mjs              c03-voyage, the busiest water
 *   CLIP=c08-intake THROTTLE=4 node scripts/video-bench.mjs
 *
 * The site scrubs each chapter as a strip of AVIF stills drawn to a canvas.
 * The alternative is one short all-keyframe video per chapter (ffmpeg -g 1, so
 * every frame decodes on its own), seeked to the frame the scroll asks for and
 * drawn to the canvas from requestVideoFrameCallback. This builds that video
 * from the same source, at the same 1600x900 and the same frame count as the
 * strip, as H.264 and as VP9, and scrubs all of them through the same playhead.
 *
 * Both are given every byte up front (the video as a blob URL, the strip as
 * decoded bitmaps), so this measures scrubbing, not the network. The playhead
 * runs at four speeds, from a slow read to a flick, back and forth. Per mode:
 *
 *   exact    share of frames where the canvas showed the frame asked for
 *   lag      mean frames between the frame asked for and the frame shown
 *   seek     mean ms from setting currentTime to the frame being presented
 *   tick     mean main-thread ms per animation frame spent on the film
 *   long     animation frames over 25 ms
 *   KB       what the chapter costs to download
 *   ssim     mean SSIM of its frames against a lossless render of the same
 *            frames; each video steps its CRF down until it at least matches
 *            the strip, so the byte counts compare like with like
 *
 * Measured on c03-voyage, c08-intake and c12-qc, at 1x and 4x CPU:
 *
 *   - The strip shows the frame asked for on every tick (100%). Video shows
 *     it on 53% of ticks and averages 0.6 frames behind. That is not decode
 *     time: every seek lands in one vsync (16.7 ms) for both codecs at both
 *     throttles. It is the pipeline: a seek presents on the *next* frame, so
 *     whenever the scroll moves, video is one frame late. At a slow read
 *     (0.25 frames per tick) that is hidden 3 ticks in 4; at a frame per tick
 *     and faster, video is never on the frame the scroll is on.
 *   - At matched SSIM, all-keyframe H.264 is 1.3-1.9x the strip's AVIF bytes
 *     and VP9 is 2.4-4.2x.
 *   - Main-thread cost per tick is negligible either way (under 0.1 ms).
 *   - rVFC only reports frames presented for composition, so the video
 *     element has to stay visible in the page, and a seek to the time already
 *     set never reports at all.
 *
 * So the strips stay: they scrub exactly and download less.
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const CLIP = process.env.CLIP ?? 'c03-voyage'
const THROTTLE = Number(process.env.THROTTLE ?? 1)
const manifest = JSON.parse(fs.readFileSync('public/assets/frames/frames.json', 'utf8'))
const N = manifest.desktop.clips[CLIP]
const FPS = 30
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'skylark-vbench-'))

const src = path.join('media-src/video', `${CLIP}.mp4`)
const videos = {
  h264: path.join(TMP, 'clip.mp4'),
  vp9: path.join(TMP, 'clip.webm'),
}

const stripDir = path.join('public/assets/frames/d', CLIP)
const stripFiles = fs.readdirSync(stripDir).filter((f) => f.endsWith('.avif')).sort()

// The N frames the strip holds, cut losslessly the way make-frames.mjs cuts
// them. They are the quality reference, and the videos are encoded from them,
// laid end to end at 30 fps with every frame a keyframe, so frame i is the
// same picture in every format.
const ref = path.join(TMP, 'ref')
fs.mkdirSync(ref)
execFileSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', src, '-vf', `scale=1600:900:flags=lanczos,fps=${N}/5`,
  '-frames:v', String(N), path.join(ref, '%04d.png')])
// Compared frame by frame in decode order, never by timestamp: a video is
// first decoded to its own image sequence, so frame i is always set against
// frame i whatever its timestamps say.
const ssimOf = (input, seq) => {
  if (!seq) {
    const out = fs.mkdtempSync(path.join(TMP, 'dec-'))
    execFileSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', input, '-fps_mode', 'passthrough', path.join(out, '%04d.png')])
    input = path.join(out, '%04d.png')
  }
  const r = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', input, '-i', path.join(ref, '%04d.png'),
    '-lavfi', 'ssim', '-f', 'null', '-'], { encoding: 'utf8' })
  return +(r.stderr.match(/All:([0-9.]+)/)?.[1] ?? 0)
}
const stripPng = path.join(TMP, 'strip')
fs.mkdirSync(stripPng)
for (const [i, f] of stripFiles.entries())
  await sharp(path.join(stripDir, f)).png().toFile(path.join(stripPng, `${String(i + 1).padStart(4, '0')}.png`))
const ff = (args) => execFileSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(ref, '%04d.png'), ...args])
const ssim = { strip: ssimOf(path.join(stripPng, '%04d.png'), true) }
// Each video steps its CRF down until it is at least as sharp as the strip,
// so the byte counts compare like with like.
const encoders = {
  h264: (crf) => ['-c:v', 'libx264', '-g', '1', '-crf', String(crf), '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'],
  vp9: (crf) => ['-c:v', 'libvpx-vp9', '-g', '1', '-crf', String(crf), '-b:v', '0', '-row-mt', '1'],
}
const crfs = { h264: [35, 33, 31, 29, 27, 25, 23, 21, 19, 17, 15], vp9: [63, 58, 54, 50, 46, 42, 38, 34, 30, 26, 22] }
const crfUsed = {}
for (const k of Object.keys(videos)) {
  for (const crf of crfs[k]) {
    ff([...encoders[k](crf), videos[k]])
    ssim[k] = ssimOf(videos[k], false)
    crfUsed[k] = crf
    if (ssim[k] >= ssim.strip) break
  }
}
const bytes = {
  strip: stripFiles.reduce((a, f) => a + fs.statSync(path.join(stripDir, f)).size, 0),
  h264: fs.statSync(videos.h264).size,
  vp9: fs.statSync(videos.vp9).size,
}

const b = await chromium.launch({ channel: 'chromium' })
const page = await b.newPage({ viewport: { width: 1600, height: 900 } })
const cdp = await page.context().newCDPSession(page)
if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
await page.route('http://bench.local/**', (r) => {
  const u = new URL(r.request().url()).pathname
  if (u === '/') return r.fulfill({ contentType: 'text/html', body: '<canvas width=1600 height=900></canvas>' })
  if (u === '/clip.mp4') return r.fulfill({ contentType: 'video/mp4', body: fs.readFileSync(videos.h264) })
  if (u === '/clip.webm') return r.fulfill({ contentType: 'video/webm', body: fs.readFileSync(videos.vp9) })
  r.fulfill({ contentType: 'image/avif', body: fs.readFileSync(path.join(stripDir, path.basename(u))) })
})
await page.goto('http://bench.local/')

const results = await page.evaluate(async ({ N, FPS, frames }) => {
  const cv = document.querySelector('canvas')
  const g = cv.getContext('2d', { alpha: false })
  const raf = () => new Promise((r) => requestAnimationFrame(r))
  // a playhead that sweeps the clip forward and back at a given frames per tick
  const SPEEDS = [0.25, 0.5, 1, 2]
  const path = []
  for (const v of SPEEDS) {
    for (let x = 0; x < N - 1; x += v) path.push(Math.floor(x))
    for (let x = N - 1; x > 0; x -= v) path.push(Math.floor(x))
  }

  async function run(setup) {
    const r = await setup()
    // settle, then run the playhead once per animation frame
    for (let i = 0; i < 10; i++) await raf()
    let exact = 0, lagSum = 0, tickSum = 0, long = 0, last = performance.now()
    for (const want of path) {
      await raf()
      const now = performance.now()
      if (now - last > 25) long++
      last = now
      const t0 = performance.now()
      r.show(want)
      tickSum += performance.now() - t0
      const shown = r.shown()
      if (shown === want) exact++
      lagSum += shown < 0 ? N : Math.abs(shown - want)
    }
    r.done?.()
    return {
      exact: +((exact / path.length) * 100).toFixed(1),
      lag: +(lagSum / path.length).toFixed(2),
      seek: r.seekMs ? +r.seekMs().toFixed(1) : 0,
      tick: +(tickSum / path.length).toFixed(2),
      long,
    }
  }

  const strip = () =>
    Promise.all(frames.map((f) => fetch('/' + f).then((x) => x.blob()).then(createImageBitmap))).then((bmps) => {
      let shown = -1
      return {
        show(i) {
          g.drawImage(bmps[i], 0, 0, 1600, 900)
          shown = i
        },
        shown: () => shown,
      }
    })

  const video = (file) => async () => {
    const blob = await (await fetch(file)).blob()
    const v = document.createElement('video')
    v.muted = true
    v.preload = 'auto'
    v.src = URL.createObjectURL(blob)
    // requestVideoFrameCallback fires on frames presented for composition. A
    // detached, hidden or near-transparent element is never composited, so a
    // seek on one never reports: the site would have to keep a visible video
    // element in the page, under the canvas.
    v.style.cssText = 'position:fixed;right:0;bottom:0;width:160px;height:90px'
    document.body.append(v)
    await new Promise((res, rej) => {
      v.oncanplaythrough = res
      v.onerror = () => rej(new Error(`cannot play ${file}`))
    })
    let shown = -1, target = -1, asked = -1, askedAt = 0, seekSum = 0, seeks = 0, handle = 0
    // Seeking to the time already set presents no new frame, so no callback
    // would ever come: never do it.
    const seekTo = (i) => {
      if (Math.abs(v.currentTime - (i + 0.5) / FPS) < 1e-6) {
        asked = -1
        return
      }
      asked = i
      askedAt = performance.now()
      v.cancelVideoFrameCallback(handle)
      v.currentTime = (i + 0.5) / FPS
      handle = v.requestVideoFrameCallback(onFrame)
    }
    function onFrame(_, meta) {
      g.drawImage(v, 0, 0, 1600, 900)
      // mediaTime is the presented frame's timestamp, i / FPS
      shown = Math.round(meta.mediaTime * FPS)
      if (asked >= 0) {
        seekSum += performance.now() - askedAt
        seeks++
      }
      // a seek cannot be redirected mid-flight: chase the playhead once this lands
      if (target !== asked) seekTo(target)
      else asked = -1
    }
    return {
      show(i) {
        target = i
        if (asked < 0 && i !== shown) seekTo(i)
      },
      shown: () => shown,
      seekMs: () => (seeks ? seekSum / seeks : 0),
      done: () => v.remove(),
    }
  }

  return {
    strip: await run(strip),
    h264: await run(video('/clip.mp4')),
    vp9: await run(video('/clip.webm')),
  }
}, { N, FPS, frames: stripFiles })

console.log(`${CLIP}: ${N} frames at 1600x900, playhead at 0.25/0.5/1/2 frames per tick, CPU throttle ${THROTTLE}x`)
console.table(
  Object.fromEntries(
    Object.entries(results).map(([k, v]) => [k, { ...v, KB: Math.round(bytes[k] / 1024), ssim: +ssim[k].toFixed(4), crf: crfUsed[k] ?? '-' }]),
  ),
)
await b.close()
fs.rmSync(TMP, { recursive: true, force: true })
