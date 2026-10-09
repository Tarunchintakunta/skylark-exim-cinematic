import { Suspense, useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Quality } from '@/store/useStore'
import { CameraDirector } from '@/scenes/CameraDirector'
import { SceneEnvironment } from '@/scenes/SceneEnvironment'
import { Stage } from '@/scenes/kit'
import { OceanStage } from '@/scenes/OceanStage'
import {
  HoldStage, QuayStage, PlantStage, PondsStage, QCStage,
  FreezeStage, ColdStoreStage, DocsStage, ReeferStage, FleetStage, GlobeStage,
} from '@/scenes/InteriorStages'

/**
 * Compile every shader in the scene before it is drawn, without blocking.
 *
 * drei's <Preload> compiles synchronously, and reading the programs back
 * waits on the driver to finish linking: a 60-70 ms task on a throttled phone
 * just as the globe mounted. compileAsync polls KHR_parallel_shader_compile
 * instead, so the link happens off the main thread while the film plays.
 */
function CompileAsync() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    void gl.compileAsync(scene, camera)
  }, [gl, scene, camera])
  return null
}

/**
 * The WebGL half of the page, in its own chunk.
 *
 * three, React Three Fiber and drei are most of the JavaScript the site ships,
 * and none of it is needed until the globe. App loads this lazily, so the first
 * paint only waits on the film and the copy.
 */
export default function SceneCanvas({
  quality,
  mounted,
  visible,
  near,
  onCut,
}: {
  quality: Quality
  mounted: Record<string, boolean>
  visible: Record<string, number>
  near: boolean
  onCut: () => void
}) {
  // one sphere on a dark ground does not need more than a 1.5x buffer
  const dpr = useMemo<[number, number]>(
    () => (quality === 'low' ? [1, 1.25] : [1, 1.5]),
    [quality],
  )

  return (
    <div className="canvas-layer">
      <Canvas
        dpr={dpr}
        /* Only the globe district builds, so outside it there is nothing to
           draw. On demand means React Three Fiber renders when something asks
           it to instead of every frame behind an opaque plate. */
        frameloop={near ? 'always' : 'demand'}
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
            <Stage id="ocean" visible={visible.ocean}>
              <OceanStage quality={quality} />
            </Stage>
          )}
          {mounted.hold && (
            <Stage id="hold" visible={visible.hold}>
              <HoldStage />
            </Stage>
          )}
          {mounted.quay && (
            <Stage id="quay" visible={visible.quay}>
              <QuayStage />
            </Stage>
          )}
          {mounted.plant && (
            <Stage id="plant" visible={visible.plant}>
              <PlantStage />
            </Stage>
          )}
          {mounted.ponds && (
            <Stage id="ponds" visible={visible.ponds}>
              <PondsStage />
            </Stage>
          )}
          {mounted.qc && (
            <Stage id="qc" visible={visible.qc}>
              <QCStage />
            </Stage>
          )}
          {mounted.freeze && (
            <Stage id="freeze" visible={visible.freeze}>
              <FreezeStage />
            </Stage>
          )}
          {mounted.coldstore && (
            <Stage id="coldstore" visible={visible.coldstore}>
              <ColdStoreStage />
            </Stage>
          )}
          {mounted.docs && (
            <Stage id="docs" visible={visible.docs}>
              <DocsStage />
            </Stage>
          )}
          {mounted.reefer && (
            <Stage id="reefer" visible={visible.reefer}>
              <ReeferStage />
            </Stage>
          )}
          {mounted.fleet && (
            <Stage id="fleet" visible={visible.fleet}>
              <FleetStage />
            </Stage>
          )}
          {mounted.globe && (
            <Stage id="globe" visible={visible.globe}>
              <GlobeStage />
            </Stage>
          )}
          <CompileAsync />
        </Suspense>
      </Canvas>
    </div>
  )
}
