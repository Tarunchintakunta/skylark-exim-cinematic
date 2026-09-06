import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clamp01, lerp, smoothstep } from '@/timeline/chapters'

export const DISTRICT: Record<string, [number, number, number]> = {
  ocean: [0, 0, 0],
  hold: [0, -4000, 0],
  quay: [4000, 0, 0],
  plant: [8000, 0, 0],
  ponds: [12000, 0, 0],
  qc: [8000, -4000, 0],
  freeze: [12000, -4000, 0],
  coldstore: [16000, 0, 0],
  docs: [16000, -4000, 0],
  reefer: [20000, 0, 0],
  fleet: [26000, 0, 0],
  globe: [20000, -4000, 0],
}

/** Loads a GLB and returns an isolated clone with its animation clips. */
export function useModel(url: string) {
  const gltf = useLoader(GLTFLoader, url)
  return useMemo(() => {
    const scene = gltf.scene.clone(true)
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = false
        m.receiveShadow = false
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat && 'envMapIntensity' in mat) mat.envMapIntensity = 0.85
      }
    })
    return { scene, animations: gltf.animations }
  }, [gltf])
}

interface ScrubProps {
  url: string
  /** live 0..1 playhead over the model's clips, read every frame */
  playhead?: () => number
  /** handle on the wrapper group, for looking up nodes by name */
  groupRef?: React.RefObject<THREE.Group | null>
  children?: React.ReactNode
  [key: string]: unknown
}

/**
 * Renders a GLB whose baked animation is scrubbed by scroll rather than played
 * on a clock. Doors, hatches, seal bars and conveyors all move with the reader.
 */
export function ScrubbedModel({ url, playhead, groupRef, children, ...props }: ScrubProps) {
  const { scene, animations } = useModel(url)
  const mixer = useMemo(() => new THREE.AnimationMixer(scene), [scene])
  const dur = useRef(1)

  useEffect(() => {
    let max = 0.0001
    animations.forEach((clip) => {
      const a = mixer.clipAction(clip)
      a.play()
      a.paused = true
      max = Math.max(max, clip.duration)
    })
    dur.current = max
    return () => {
      mixer.stopAllAction()
    }
  }, [animations, mixer])

  const head = useRef(playhead)
  head.current = playhead

  useFrame(() => {
    const t = head.current ? head.current() : 0
    mixer.setTime(clamp01(t) * dur.current)
  })

  return (
    <group ref={groupRef} {...props}>
      <primitive object={scene} />
      {children}
    </group>
  )
}

/**
 * One named node out of a GLB. The hero fish ship both a display pose and a
 * handled-on-deck pose in the same file; a scene should show one, not both.
 */
export function ModelPart({
  url,
  node,
  children,
  ...props
}: {
  url: string
  node: string
  children?: React.ReactNode
  [k: string]: unknown
}) {
  const { scene } = useModel(url)
  const picked = useMemo(() => {
    const found = scene.getObjectByName(node)
    if (!found) {
      // eslint-disable-next-line no-console
      console.warn(`[Skylark] node "${node}" not found in ${url}`)
      return null
    }
    found.position.set(0, 0, 0)
    found.updateMatrixWorld(true)
    return found
  }, [scene, node, url])
  if (!picked) return null
  return (
    <group {...props}>
      <primitive object={picked} />
      {children}
    </group>
  )
}

/** Static GLB, no animation cost. */
export function Model({ url, children, ...props }: { url: string; children?: React.ReactNode; [k: string]: unknown }) {
  const { scene } = useModel(url)
  return (
    <group {...props}>
      <primitive object={scene} />
      {children}
    </group>
  )
}

/**
 * Mounts children only while the scroll is inside (or just outside) the window,
 * and fades every material in the subtree so stages dissolve rather than pop.
 */
export function Stage({
  id,
  visible,
  children,
}: {
  id: keyof typeof DISTRICT
  visible: number
  children: React.ReactNode
}) {
  const ref = useRef<THREE.Group>(null)
  const v = useRef(visible)
  v.current = visible

  useFrame(() => {
    const g = ref.current
    if (!g) return
    const a = v.current
    g.visible = a > 0.004
  })

  return (
    <group ref={ref} position={DISTRICT[id]}>
      {children}
    </group>
  )
}

/** Smooth per-frame value follower — keeps camera and lights from snapping. */
export class Smooth {
  v: number
  constructor(v = 0) {
    this.v = v
  }
  to(target: number, k = 0.12) {
    this.v += (target - this.v) * k
    return this.v
  }
}

export const damp3 = (out: THREE.Vector3, target: THREE.Vector3, k: number) => {
  out.x = lerp(out.x, target.x, k)
  out.y = lerp(out.y, target.y, k)
  out.z = lerp(out.z, target.z, k)
  return out
}

export { clamp01, lerp, smoothstep }
