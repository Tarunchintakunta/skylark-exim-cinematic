import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { scrollRef } from '@/store/useStore'
import { chapters, clamp01 } from '@/timeline/chapters'

/**
 * Foreground atmosphere, over the film rather than under it.
 *
 * The plates carry the image now, so what WebGL adds here is the layer a camera
 * would have caught in front of the subject: spray off the sea, dust in the
 * light of the processing hall, cold vapour rolling out of the freezer. Plus a
 * grain and vignette pass over everything, which is most of the difference
 * between footage on a page and footage in a film.
 */
const COUNT = 700

type Mood = {
  amount: number
  size: number
  color: THREE.Color
  drift: [number, number]
  speed: number
}

const OCEAN: Mood = { amount: 0.55, size: 2.6, color: new THREE.Color('#eaf6f8'), drift: [0.30, 0.16], speed: 1.0 }
const PLANT: Mood = { amount: 0.34, size: 2.0, color: new THREE.Color('#fff4e2'), drift: [0.05, -0.05], speed: 0.35 }
const COLD: Mood = { amount: 0.85, size: 6.0, color: new THREE.Color('#dcf0ff'), drift: [-0.10, -0.22], speed: 0.55 }
const PORT: Mood = { amount: 0.30, size: 3.4, color: new THREE.Color('#f2ead9'), drift: [0.18, 0.05], speed: 0.5 }
const NONE: Mood = { amount: 0.0, size: 2.0, color: new THREE.Color('#ffffff'), drift: [0, 0], speed: 0.3 }

/** Which atmosphere belongs to which stretch of the voyage. */
const moodFor = (id: string): Mood => {
  if (/ch0[1-8]/.test(id)) return OCEAN
  if (/ch(09|19|20)/.test(id)) return PORT
  if (/ch(10|11|14|15)/.test(id)) return PLANT
  if (/ch(16|17)/.test(id)) return COLD
  return NONE
}

function Atmosphere() {
  const ref = useRef<THREE.Points>(null)
  const cur = useRef({ amount: 0, size: 2, dx: 0, dy: 0, speed: 0.5, color: new THREE.Color('#ffffff') })

  const { geo, mat } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(COUNT * 3)
    const seed = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5
      seed[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uAmount: { value: 0 },
        uSize: { value: 2 },
        uDrift: { value: new THREE.Vector2() },
        uColor: { value: new THREE.Color('#ffffff') },
      },
      vertexShader: /* glsl */ `
        attribute float seed;
        uniform float uTime; uniform float uSize; uniform vec2 uDrift;
        varying float vSeed;
        void main() {
          vSeed = seed;
          vec3 p = position;
          // drift, then wrap so the field never runs out
          p.x = mod(p.x + uDrift.x * uTime * (0.5 + seed) + 11.0, 22.0) - 11.0;
          p.y = mod(p.y + uDrift.y * uTime * (0.5 + seed) + 7.0, 14.0) - 7.0;
          p.x += sin(uTime * (0.3 + seed * 0.4) + seed * 30.0) * 0.22;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * (1.0 + seed * 1.6) * (12.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uAmount; uniform vec3 uColor;
        varying float vSeed;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d);
          if (r > 0.5) discard;
          float a = smoothstep(0.5, 0.03, r) * uAmount * (0.20 + vSeed * 0.55);
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
    })
    return { geo: g, mat: m }
  }, [])

  useFrame((state, dt) => {
    const p = scrollRef.current
    const c = chapters.find((x) => p >= x.start && p < x.end) ?? chapters[0]
    const target = moodFor(c.id)
    // ease between moods so a chapter change does not pop the field
    const k = Math.min(1, dt * 1.6)
    const s = cur.current
    s.amount += (target.amount - s.amount) * k
    s.size += (target.size - s.size) * k
    s.dx += (target.drift[0] - s.dx) * k
    s.dy += (target.drift[1] - s.dy) * k
    s.speed += (target.speed - s.speed) * k
    s.color.lerp(target.color, k)

    mat.uniforms.uTime.value = state.clock.elapsedTime * s.speed
    mat.uniforms.uAmount.value = s.amount
    mat.uniforms.uSize.value = s.size
    mat.uniforms.uDrift.value.set(s.dx, s.dy)
    mat.uniforms.uColor.value.copy(s.color)
    if (ref.current) ref.current.visible = s.amount > 0.01
  })

  return <points ref={ref} geometry={geo} material={mat} />
}

/** Grain and vignette, held on the near plane so it covers the whole frame. */
function Grade() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: { uTime: { value: 0 }, uFlash: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform float uFlash;
          varying vec2 vUv;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          void main() {
            vec2 c = vUv - 0.5;
            // vignette, weighted to the corners so the centre stays clean
            float vig = smoothstep(0.52, 1.02, length(c * vec2(1.02, 1.20)));
            float g = hash(vUv * 900.0 + fract(uTime) * 431.0) - 0.5;
            vec3 col = vec3(0.010, 0.038, 0.050) * vig;
            col += vec3(g) * 0.022;
            float a = clamp(vig * 0.72 + 0.030 + uFlash, 0.0, 1.0);
            gl_FragColor = vec4(col + vec3(uFlash), a);
          }`,
      }),
    [],
  )

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime
    // a short white bloom on each chapter boundary, the cut between reels
    const p = scrollRef.current
    let flash = 0
    for (const c of chapters) {
      const d = Math.abs(p - c.start)
      const w = (c.end - c.start) * 0.06
      if (d < w) flash = Math.max(flash, (1 - clamp01(d / w)) * 0.10)
    }
    mat.uniforms.uFlash.value = flash
  })

  return (
    <mesh material={mat} frustumCulled={false} renderOrder={999}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

export function FilmFx() {
  return (
    <div className="fx-layer" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, depth: false, stencil: false, powerPreference: 'low-power' }}
        camera={{ fov: 50, near: 0.1, far: 60, position: [0, 0, 12] }}
      >
        <Atmosphere />
        <Grade />
      </Canvas>
    </div>
  )
}
