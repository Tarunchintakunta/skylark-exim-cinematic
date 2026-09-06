import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, Preload } from '@react-three/drei'
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
import { CompassHUD } from '@/components/CompassHUD'
import { ChapterCopy } from '@/components/ChapterCopy'
import { TopBar, ChapterRail, ProgressBar, ClosingLine } from '@/components/Navigation'
import { CinematicPlates } from '@/components/CinematicPlates'
import { RFQ } from '@/components/RFQ'
import { Loader, NoWebGL } from '@/components/Loader'

const STAGE_RANGE: Record<string, [string, string]> = {
  ocean: ['ch01-opening-port', 'ch08-return-to-port'],
  hold: ['ch07-onboard-cold-storage', 'ch07-onboard-cold-storage'],
  quay: ['ch09-cold-chain-transfer', 'ch09-cold-chain-transfer'],
  plant: ['ch10-processing-arrival', 'ch11-cutting'],
  ponds: ['ch12-pond-origin', 'ch13-product-forms'],
  qc: ['ch15-qc-and-residue-testing', 'ch15-qc-and-residue-testing'],
  freeze: ['ch16-freezing-and-glazing', 'ch16-freezing-and-glazing'],
  coldstore: ['ch17-packing-and-cold-storage', 'ch17-packing-and-cold-storage'],
  docs: ['ch18-export-documents', 'ch18-export-documents'],
  reefer: ['ch19-reefer-containers', 'ch19-reefer-containers'],
  fleet: ['ch20-container-vessel', 'ch20-container-vessel'],
  globe: ['ch21-globe-and-routes', 'ch22-rfq'],
}
// grading returns to the plant later in the film
const EXTRA: Record<string, [string, string][]> = {
  plant: [['ch14-grading', 'ch14-grading']],
}

const bounds = (id: string): [number, number] => {
  const [a, b] = STAGE_RANGE[id]
  const A = chapters.find((c) => c.id === a)!
  const B = chapters.find((c) => c.id === b)!
  let lo = A.start
  let hi = B.end
  ;(EXTRA[id] ?? []).forEach(([x, y]) => {
    lo = Math.min(lo, chapters.find((c) => c.id === x)!.start)
    hi = Math.max(hi, chapters.find((c) => c.id === y)!.end)
  })
  return [lo, hi]
}

const MOUNT_PAD = 0.035

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
  const progress = useStore((s) => s.progress)
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
      const on = progress > lo - MOUNT_PAD && progress < hi + MOUNT_PAD
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

  const dpr = useMemo<[number, number]>(
    () => (quality === 'low' ? [1, 1.35] : quality === 'medium' ? [1, 1.75] : [1, 2]),
    [quality],
  )

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
      <div className="canvas-layer">
        <Canvas
          dpr={dpr}
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
          onCreated={({ gl, scene }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 0.98
            gl.outputColorSpace = THREE.SRGBColorSpace
            scene.fog = null
          }}
        >
          <color attach="background" args={['#bfe0ec']} />
          <CameraDirector onCut={onCut} />
          <SceneEnvironment intensity={0.34} />
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
          <AdaptiveDpr pixelated={false} />
        </Canvas>
      </div>

      <CinematicPlates />

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
      <CompassHUD />
      <RFQ />
      <ClosingLine />
      <Loader />
    </>
  )
}
