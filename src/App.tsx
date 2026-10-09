import { lazy, startTransition, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { scrollRef, useStore } from '@/store/useStore'
import { useScrollTimeline } from '@/timeline/useScrollTimeline'
import { TOTAL_SCROLL_VH, chapters } from '@/timeline/chapters'
import { ChapterCopy } from '@/components/ChapterCopy'
import { TopBar, ChapterRail, ProgressBar, ClosingLine } from '@/components/Navigation'
import { FilmStrip } from '@/components/FilmStrip'
import { RFQ } from '@/components/RFQ'
import { Loader, NoWebGL } from '@/components/Loader'

const loadScene = () => import('@/scenes/SceneCanvas')
const SceneCanvas = lazy(loadScene)

const STAGE_RANGE: Record<string, [string, string]> = {
  ocean: ['c01-port', 'c07-return'],
  hold: ['c06-hold', 'c06-hold'],
  quay: ['c07-return', 'c07-return'],
  plant: ['c08-intake', 'c09-cutting'],
  ponds: ['c10-ponds', 'c11-shrimp'],
  qc: ['c12-qc', 'c12-qc'],
  freeze: ['c13-freezing', 'c13-freezing'],
  coldstore: ['c14-coldstore', 'c14-coldstore'],
  docs: ['c15-reefer', 'c15-reefer'],
  reefer: ['c15-reefer', 'c15-reefer'],
  fleet: ['c16-vessel', 'c16-vessel'],
  globe: ['c17-routes', 'c18-rfq'],
}

const bounds = (id: string): [number, number] => {
  const [a, b] = STAGE_RANGE[id]
  const A = chapters.find((c) => c.id === a)!
  const B = chapters.find((c) => c.id === b)!
  return [A.start, B.end]
}

const MOUNT_PAD = 0.035
/**
 * The globe is the one district that still builds, and standing it up costs
 * real time: a WebGL context, shader compilation, the GLB, and a generated
 * environment map. All of that used to land on the frame the reader scrolled
 * into the chapter, which showed up as a stall approaching a second long. It
 * mounts a long way early instead, while the film is still covering it, so the
 * cost is paid during a quiet stretch and the chapter is warm on arrival.
 */
const GLOBE_WARMUP = 0.22

/**
 * Which districts still get built.
 *
 * The film carries chapters 1 to 16 now, so the modelled versions of those
 * scenes sit behind an opaque plate and are never seen. Building them anyway
 * cost tens of megabytes of GLB and a lot of GPU for nothing, and risked the
 * modelled look surfacing through a gap. The globe is the one place the site
 * still wants real geometry, because the routes have to be dimensional.
 *
 * The other stages are intact in src/scenes and in the asset manifest. Widen
 * this set to bring one back.
 */
const LIVE_STAGES = new Set(['globe'])

function detectWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl'))
    )
  } catch {
    return false
  }
}

/**
 * Everything React needs to know about the scroll position, as one value:
 * which stages are mounted, which are visible, and whether the globe is close
 * enough to draw every frame. `key` changes only when one of those crosses a
 * threshold, a handful of times over the whole page.
 */
function sceneAt(p: number) {
  const mounted: Record<string, boolean> = {}
  const visible: Record<string, number> = {}
  for (const id of Object.keys(STAGE_RANGE)) {
    const [lo, hi] = bounds(id)
    const pad = id === 'globe' ? GLOBE_WARMUP : MOUNT_PAD
    mounted[id] = LIVE_STAGES.has(id) && p > lo - pad && p < hi + pad
    visible[id] = p > lo - MOUNT_PAD && p < hi + MOUNT_PAD ? 1 : 0
  }
  /* Mounted early so the context, the shaders and the environment map are all
     built during a quiet stretch, but only drawing once the reader is close:
     on a weak GPU, rendering the globe for the last third of the page would
     take frames away from the film that is still covering it. Preload does the
     compiling at mount, which is the part that used to stall. */
  const near = p > bounds('globe')[0] - MOUNT_PAD
  const key = JSON.stringify([mounted, visible, near])
  return { key, mounted, visible, near }
}

export default function App() {
  const spacer = useRef<HTMLDivElement>(null)
  const veil = useRef<HTMLDivElement>(null)
  const quality = useStore((s) => s.quality)
  const ready = useStore((s) => s.ready)
  const webglOk = useStore((s) => s.webglOk)
  const setWebglOk = useStore((s) => s.setWebglOk)
  /* The scroll position never goes through React. A ticker reads it each
     frame and only hands React a new value when a stage threshold is
     crossed, so the tree reconciles a few times per page, not per frame. */
  const [scene, setScene] = useState(() => sceneAt(0))

  useScrollTimeline(spacer)

  // the automated visual QA reads these to land its stops on real chapters
  useEffect(() => {
    ;(window as unknown as { __SKYLARK_CHAPTERS__?: unknown }).__SKYLARK_CHAPTERS__ =
      chapters.map((c) => ({ id: c.id, num: c.num, nav: c.nav, start: c.start, end: c.end }))
  }, [])

  useEffect(() => {
    setWebglOk(detectWebGL())
  }, [setWebglOk])

  useEffect(() => {
    let key = ''
    const tick = () => {
      const next = sceneAt(scrollRef.current)
      if (next.key === key) return
      key = next.key
      // a transition lets React build the WebGL subtree in slices between
      // frames of the film instead of in one long task
      startTransition(() => setScene(next))
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  /* Fetch and parse the WebGL chunk once the opening is on screen and the
     browser is idle, rather than at the threshold mid-scroll, where parsing
     three would land between two frames of the film. */
  useEffect(() => {
    if (!ready || !webglOk) return
    const ric = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1200))
    ric(() => void loadScene(), { timeout: 4000 })
  }, [ready, webglOk])

  const onCut = useCallback(() => {
    const el = veil.current
    if (!el) return
    el.classList.add('on')
    window.setTimeout(() => el.classList.remove('on'), 130)
  }, [])

  if (!webglOk) return <NoWebGL />

  return (
    <>
      {/* The WebGL context only exists while the globe needs it. Left mounted,
          a full-viewport canvas is another large layer for the compositor to
          carry down the whole page for nothing. */}
      {scene.mounted.globe && (
        <Suspense fallback={null}>
          <SceneCanvas
            quality={quality}
            mounted={scene.mounted}
            visible={scene.visible}
            near={scene.near}
            onCut={onCut}
          />
        </Suspense>
      )}

      <FilmStrip />

      <div className="veil" ref={veil} />

      <div
        className="scroll-spacer"
        ref={spacer}
        style={{ height: `${TOTAL_SCROLL_VH}vh` }}
        id="top"
      />

      <ProgressBar />
      <TopBar />
      <ChapterRail />
      <ChapterCopy />
      <RFQ />
      <ClosingLine />
      <Loader />
    </>
  )
}
