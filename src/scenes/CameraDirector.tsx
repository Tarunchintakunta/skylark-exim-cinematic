import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { camKeys } from './cameraKeys'
import { DISTRICT } from './kit'
import { scrollRef } from '@/store/useStore'
import { smoothstep } from '@/timeline/chapters'

const tmpA = new THREE.Vector3()
const tmpB = new THREE.Vector3()

/**
 * Drives the single camera along the whole film. Inside a stage the shot
 * interpolates; crossing into a new stage is a hard cut, which is what a cut
 * should be.
 */
export function CameraDirector({ onCut }: { onCut?: (stage: string) => void }) {
  const { camera } = useThree()
  const pos = useRef(new THREE.Vector3())
  const tgt = useRef(new THREE.Vector3())
  const fov = useRef(45)
  const stage = useRef<string>('')
  const init = useRef(false)

  useFrame((_, dt) => {
    const p = scrollRef.current
    let i = 0
    while (i < camKeys.length - 2 && camKeys[i + 1].p <= p) i++
    const a = camKeys[i]
    const b = camKeys[Math.min(i + 1, camKeys.length - 1)]
    const span = Math.max(1e-6, b.p - a.p)
    const t = smoothstep((p - a.p) / span)

    const sameStage = a.stage === b.stage
    const key = sameStage ? null : t > 0.5 ? b : a
    const useKey = key ?? null
    const activeStage = useKey ? useKey.stage : a.stage
    const off = DISTRICT[activeStage]

    if (useKey) {
      tmpA.set(useKey.pos[0] + off[0], useKey.pos[1] + off[1], useKey.pos[2] + off[2])
      tmpB.set(useKey.target[0] + off[0], useKey.target[1] + off[1], useKey.target[2] + off[2])
      fov.current = useKey.fov
    } else {
      tmpA.set(
        a.pos[0] + (b.pos[0] - a.pos[0]) * t + off[0],
        a.pos[1] + (b.pos[1] - a.pos[1]) * t + off[1],
        a.pos[2] + (b.pos[2] - a.pos[2]) * t + off[2],
      )
      tmpB.set(
        a.target[0] + (b.target[0] - a.target[0]) * t + off[0],
        a.target[1] + (b.target[1] - a.target[1]) * t + off[1],
        a.target[2] + (b.target[2] - a.target[2]) * t + off[2],
      )
      fov.current = a.fov + (b.fov - a.fov) * t
    }

    if (activeStage !== stage.current) {
      if (stage.current !== '') onCut?.(activeStage)
      stage.current = activeStage
      pos.current.copy(tmpA)
      tgt.current.copy(tmpB)
    }

    if (!init.current) {
      pos.current.copy(tmpA)
      tgt.current.copy(tmpB)
      init.current = true
    }

    // critically damped follow — the dolly never snaps
    const k = Math.min(1, dt * 9)
    pos.current.lerp(tmpA, k)
    tgt.current.lerp(tmpB, k)

    camera.position.copy(pos.current)
    camera.lookAt(tgt.current)
    const cam = camera as THREE.PerspectiveCamera
    if (Math.abs(cam.fov - fov.current) > 0.01) {
      cam.fov += (fov.current - cam.fov) * k
      cam.updateProjectionMatrix()
    }
  })

  return null
}

/** Which stage is active for a given scroll position. */
export function stageAt(p: number) {
  let i = 0
  while (i < camKeys.length - 2 && camKeys[i + 1].p <= p) i++
  const a = camKeys[i]
  const b = camKeys[Math.min(i + 1, camKeys.length - 1)]
  if (a.stage === b.stage) return a.stage
  const span = Math.max(1e-6, b.p - a.p)
  return (p - a.p) / span > 0.5 ? b.stage : a.stage
}
