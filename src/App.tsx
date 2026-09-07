import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Preload } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import { useScrollTimeline } from '@/timeline/useScrollTimeline'
import { TOTAL_SCROLL_VH, chapters } from '@/timeline/chapters'
import { CameraDirector } from '@/scenes/CameraDirector'
import { SceneEnvironment } from '@/scenes/SceneEnvironment'
import { Stage } from '@/scenes/kit'
import { OceanStage } from '@/scenes/OceanStage'
import {
  HoldStage, QuayStage, PlantStage, PondsStage, QCStage,
  FreezeStage, ColdStoreStage, DocsStage, ReeferStage, FleetStage, GlobeStage,
} from '@/scenes/InteriorStages'
import { ChapterCopy } from '@/components/ChapterCopy'
import { TopBar, ChapterRail, ProgressBar, ClosingLine } from '@/components/Navigation'
import { FilmStrip } from '@/components/FilmStrip'
import { RFQ } from '@/components/RFQ'
import { Loader, NoWebGL } from '@/components/Loader'

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
/* how finely stage mounting tracks the scroll: 120 steps over the whole film
   is far finer than MOUNT_PAD needs and costs 120 re-renders instead of
   thousands */
const MOUNT_BUCKETS = 120

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

export default function App() {
  const spacer = useRef<HTMLDivElement>(null)
  const veil = useRef<HTMLDivElement>(null)
  const quality = useStore((s) => s.quality)
  /* Selecting raw progress re-rendered this component, and so reconciled the
     whole tree, on every single scroll frame. Mounting only cares roughly
     where the reader is, so quantise it and let Zustand skip the re-render
     until the bucket actually changes. */
  const bucket = useStore((s) => Math.round(s.progress * MOUNT_BUCKETS))
  const progress = bucket / MOUNT_BUCKETS
  const webglOk = useStore((s) => s.webglOk)
  const setWebglOk = useStore((s) => s.setWebglOk)
  const [mounted, setMounted] = useState<Record<string, boolean>>({ ocean: true })

  useScrollTimeline(spacer)

  // the automated visual QA reads these to land its stops on real chapters
  useEffect(() => {
    ;(window as unknown as { __SKYLARK_CHAPTERS__?: unknown }).__SKYLARK_CHAPTERS__ =
      chapters.map((c) => ({ id: c.id, num: c.num, nav: c.nav, start: c.start, end: c.end }))
  }, [])

  useEffect(() => {
    setWebglOk(detectWebGL())
  }, [setWebglOk])

  // mount a stage a little before the reader arrives, keep it a little after
  useEffect(() => {
    const next: Record<string, boolean> = {}
    let changed = false
    Object.keys(STAGE_RANGE).forEach((id) => {
      const [lo, hi] = bounds(id)
      const pad = id === 'globe' ? GLOBE_WARMUP : MOUNT_PAD
      const on = LIVE_STAGES.has(id) && progress > lo - pad && progress < hi + pad
      next[id] = on
      if (!!mounted[id] !== on) changed = true
    })
    if (changed) setMounted(next)
  }, [progress, mounted])

  const onCut = useCallback(() => {
    const el = veil.current
    if (!el) return
    el.classList.add('on')
    window.setTimeout(() => el.classList.remove('on'), 130)
  }, [])

  // one sphere on a dark ground does not need a full retina buffer
  const dpr = useMemo<[number, number]>(
    () => (quality === 'low' ? [1, 1.25] : quality === 'medium' ? [1, 1.5] : [1, 1.75]),
    [quality],
  )

  /* Mounted early so the context, the shaders and the environment map are all
     built during a quiet stretch, but only drawing once the reader is close:
     on a weak GPU, rendering the globe for the last third of the page would
     take frames away from the film that is still covering it. Preload does the
     compiling at mount, which is the part that used to stall. */
  const globeNear = progress > bounds('globe')[0] - MOUNT_PAD

  const visible = useCallback(
    (id: string) => {
      const [lo, hi] = bounds(id)
      return progress > lo - MOUNT_PAD && progress < hi + MOUNT_PAD ? 1 : 0
    },
    [progress],
  )

  if (!webglOk) return <NoWebGL />

  return (
    <>
      {/* The WebGL context only exists while the globe needs it. Left mounted,
          a full-viewport canvas is another large layer for the compositor to
          carry down the whole page for nothing. */}
      {mounted.globe && (
      <div className="canvas-layer">
        <Canvas
          dpr={dpr}
          /* Only the globe district builds, so outside it there is nothing to
             draw. On demand means React Three Fiber renders when something asks
             it to instead of every frame behind an opaque plate. */
          frameloop={globeNear ? 'always' : 'demand'}
          gl={{
            antialias: quality !== 'low',
            powerPreference: 'high-performance',
            alpha: false,
            stencil: false,
            // let the automated visual QA read pixels back off the canvas
            preserveDrawingBuffer:
              typeof window !== 'undefined' && window.location.search.includes('qa=1'),
          }}
          camera={{ fov: 46, near: 0.1, far: 6000, position: [-46, 2.6, 34] }}
          onCreated={(state) => {
            const { gl, scene } = state
            /* Three.js asks the driver for the shader link log as soon as it
               builds a program, and that call blocks until the driver has
               finished compiling. It was the single longest stall on the page,
               around 800ms as the reader reached the globe. Turning the check
               off lets the driver compile in its own time; it only ever
               suppressed a console message we do not read in production. */
            gl.debug.checkShaderErrors = false
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 0.98
            gl.outputColorSpace = THREE.SRGBColorSpace
            scene.fog = null
            // under ?qa=1 the harness can raycast the live scene, which is how
            // stray geometry gets identified instead of guessed at
            if (typeof window !== 'undefined' && window.location.search.includes('qa=1')) {
              ;(window as unknown as { __SKYLARK_R3F__?: unknown }).__SKYLARK_R3F__ = state
            }
          }}
        >
          <color attach="background" args={['#04141c']} />
          <CameraDirector onCut={onCut} />
          {/* only the globe is lit by this now, and it sits on a dark ground */}
          <SceneEnvironment intensity={0.17} />
          <Suspense fallback={null}>
            {mounted.ocean && (
              <Stage id="ocean" visible={visible('ocean')}>
                <OceanStage quality={quality} />
              </Stage>
            )}
            {mounted.hold && (
              <Stage id="hold" visible={visible('hold')}>
                <HoldStage />
              </Stage>
            )}
            {mounted.quay && (
              <Stage id="quay" visible={visible('quay')}>
                <QuayStage />
              </Stage>
            )}
            {mounted.plant && (
              <Stage id="plant" visible={visible('plant')}>
                <PlantStage />
              </Stage>
            )}
            {mounted.ponds && (
              <Stage id="ponds" visible={visible('ponds')}>
                <PondsStage />
              </Stage>
            )}
            {mounted.qc && (
              <Stage id="qc" visible={visible('qc')}>
                <QCStage />
              </Stage>
            )}
            {mounted.freeze && (
              <Stage id="freeze" visible={visible('freeze')}>
                <FreezeStage />
              </Stage>
            )}
            {mounted.coldstore && (
              <Stage id="coldstore" visible={visible('coldstore')}>
                <ColdStoreStage />
              </Stage>
            )}
            {mounted.docs && (
              <Stage id="docs" visible={visible('docs')}>
                <DocsStage />
              </Stage>
            )}
            {mounted.reefer && (
              <Stage id="reefer" visible={visible('reefer')}>
                <ReeferStage />
              </Stage>
            )}
            {mounted.fleet && (
              <Stage id="fleet" visible={visible('fleet')}>
                <FleetStage />
              </Stage>
            )}
            {mounted.globe && (
              <Stage id="globe" visible={visible('globe')}>
                <GlobeStage />
              </Stage>
            )}
            <Preload all />
          </Suspense>
        </Canvas>
      </div>
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
