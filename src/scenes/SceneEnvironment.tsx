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
    const pmrem = new THREE.PMREMGenerator(gl)
    pmrem.compileEquirectangularShader()
    const room = new RoomEnvironment()
    const rt = pmrem.fromScene(room, 0.04)
    scene.environment = rt.texture
    scene.environmentIntensity = intensity
    return () => {
      scene.environment = null
      rt.dispose()
      pmrem.dispose()
    }
  }, [gl, scene, intensity])
  return null
}
