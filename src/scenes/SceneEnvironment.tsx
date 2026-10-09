import { useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/**
 * Stainless steel, brass and painted hull plate are all metallic. Without an
 * environment to reflect, physically based metal renders black — so the whole
 * film gets a generated studio environment instead of a remote HDR download.
 */
export function SceneEnvironment({ intensity = 0.9 }: { intensity?: number }) {
  const { gl, scene } = useThree()
  useEffect(() => {
    /* Generating the map is ~50 ms on a throttled phone. It used to run in the
       same task as mounting the canvas, which made one long stall; waiting for
       an idle moment splits it into its own task. The globe mounts well before
       the reader reaches it, so it is lit long before it is seen. */
    let rt: THREE.WebGLRenderTarget | null = null
    let pmrem: THREE.PMREMGenerator | null = null
    const ric = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 50))
    const cic = window.cancelIdleCallback ?? window.clearTimeout
    const id = ric(() => {
      pmrem = new THREE.PMREMGenerator(gl)
      rt = pmrem.fromScene(new RoomEnvironment(), 0.04)
      scene.environment = rt.texture
      scene.environmentIntensity = intensity
    })
    return () => {
      cic(id)
      scene.environment = null
      rt?.dispose()
      pmrem?.dispose()
    }
  }, [gl, scene, intensity])
  return null
}
