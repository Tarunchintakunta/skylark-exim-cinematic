import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { ScrubbedModel, Model, ModelPart } from './kit'
import { makeOceanMaterial, gerstnerGLSL, swellRef } from '@/shaders/ocean'
import { scrollRef } from '@/store/useStore'
import { chapters, clamp01, localProgress, smoothstep } from '@/timeline/chapters'

const ch = (id: string) => chapters.find((c) => c.id === id)!

function Ocean({ quality }: { quality: string }) {
  const mat = useMemo(() => makeOceanMaterial(), [])
  const segs = quality === 'low' ? 140 : quality === 'medium' ? 220 : 320
  const geo = useMemo(() => new THREE.PlaneGeometry(1700, 1700, segs, segs), [segs])
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    const p = scrollRef.current
    mat.uniforms.uTime.value = state.clock.elapsedTime
    if (ref.current) {
      ref.current.position.x = Math.round(state.camera.position.x / 40) * 40
      ref.current.position.z = Math.round(state.camera.position.z / 40) * 40
    }
    // calm in the harbour, adventurous in the open bay, calm again on return.
    // Both ramps are chapter-relative: absolute page fractions made the return
    // leg far longer than the chapter, so she came home over a black sea.
    const bay = clamp01(smoothstep(localProgress(p, ch('c02-boarding')) * 1.7))
    const home = 1 - clamp01(smoothstep(localProgress(p, ch('c07-return')) * 1.15))
    const swell = 0.22 + 0.95 * Math.min(bay, Math.max(0.28, home))
    mat.uniforms.uSwell.value = swell
    swellRef.current = swell
    // harbour water is shallow and green, the open Bay is deep and navy
    mat.uniforms.uDepthBias.value = 0.10 + 0.50 * Math.min(bay, Math.max(0.18, home))
  })
  return <mesh ref={ref} geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} />
}

function Sky() {
  const geo = useMemo(() => new THREE.SphereGeometry(1600, 32, 20), [])
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color('#5FA8CE') },
          uMid: { value: new THREE.Color('#BFE0EC') },
          uHaze: { value: new THREE.Color('#E8F2F2') },
          uTime: { value: 0 },
        },
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHaze; uniform float uTime;
          varying vec3 vP;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
          float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5;} return v; }
          void main(){
            vec3 d = normalize(vP);
            float h = clamp(d.y*0.5+0.5, 0.0, 1.0);
            vec3 col = mix(uHaze, uMid, smoothstep(0.46, 0.62, h));
            col = mix(col, uTop, smoothstep(0.6, 0.95, h));
            // drifting cloud bands
            if (d.y > 0.02) {
              vec2 uv = d.xz / max(d.y, 0.02) * 0.06 + vec2(uTime*0.004, uTime*0.0016);
              float c = fbm(uv * 1.7);
              c = smoothstep(0.52, 0.86, c) * smoothstep(0.02, 0.30, d.y);
              col = mix(col, vec3(1.0, 0.995, 0.985), c * 0.72);
            }
            // sun bloom
            vec3 sd = normalize(vec3(0.55, 0.62, 0.35));
            float s = pow(max(dot(d, sd), 0.0), 220.0);
            col += vec3(1.0, 0.94, 0.80) * s * 1.4;
            col += vec3(1.0, 0.95, 0.85) * pow(max(dot(d, sd), 0.0), 12.0) * 0.16;
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  )
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
  })
  return <mesh geometry={geo} material={mat} />
}

/** Quay, cranes and warehouses behind the opening shot. */
function PortBackdrop() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const p = scrollRef.current
    const out = smoothstep((p - ch('c03-voyage').start) / 0.055)
    const back = smoothstep((p - ch('c07-return').start) / 0.05)
    const away = Math.max(0, out - back)
    if (ref.current) {
      ref.current.position.z = -away * 1500
      ref.current.visible = away < 0.985
    }
  })
  const g = useMemo(() => {
    const grp = new THREE.Group()
    const conc = new THREE.MeshStandardMaterial({ color: '#9aa5a4', roughness: 0.95 })
    const steel = new THREE.MeshStandardMaterial({ color: '#8e9698', roughness: 0.5, metalness: 0.6 })
    const orange = new THREE.MeshStandardMaterial({ color: '#c2571f', roughness: 0.6 })
    const shed = new THREE.MeshStandardMaterial({ color: '#cfd7d6', roughness: 0.8 })
    const quay = new THREE.Mesh(new THREE.BoxGeometry(620, 6, 90), conc)
    quay.position.set(-60, 1.0, -300)
    grp.add(quay)
    for (let i = 0; i < 6; i++) {
      const cr = new THREE.Group()
      for (const s of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(2.2, 46, 2.2), orange)
        leg.position.set(s * 13, 23, 0)
        cr.add(leg)
        const leg2 = leg.clone()
        leg2.position.set(s * 13, 23, 24)
        cr.add(leg2)
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(32, 2.6, 28), orange)
      beam.position.set(0, 47, 12)
      cr.add(beam)
      const boom = new THREE.Mesh(new THREE.BoxGeometry(78, 2.2, 3.2), orange)
      boom.position.set(34, 49, 12)
      cr.add(boom)
      const cab = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 5), shed)
      cab.position.set(8, 42, 12)
      cr.add(cab)
      cr.position.set(-240 + i * 96, 4, -318)
      grp.add(cr)
    }
    for (let i = 0; i < 7; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(40, 14, 26), shed)
      w.position.set(-330 + i * 96, 11, -392)
      grp.add(w)
    }
    for (let i = 0; i < 60; i++) {
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(12, 2.6, 2.44),
        new THREE.MeshStandardMaterial({
          color: ['#1a4780', '#9e2620', '#1f6b52', '#8c9195', '#e8ebec'][i % 5],
          roughness: 0.6,
        }),
      )
      c.position.set(-300 + (i % 15) * 15, 5.3 + Math.floor(i / 15) * 2.62, -336 - ((i * 7) % 3) * 4)
      grp.add(c)
    }
    const bollardGeo = new THREE.CylinderGeometry(0.5, 0.6, 1.6, 10)
    for (let i = 0; i < 16; i++) {
      const b = new THREE.Mesh(bollardGeo, steel)
      b.position.set(-230 + i * 30, 4.4, -258)
      grp.add(b)
    }
    return grp
  }, [])
  return (
    <group ref={ref}>
      <primitive object={g} />
    </group>
  )
}

function Headland() {
  const g = useMemo(() => {
    const grp = new THREE.Group()
    const m = new THREE.MeshStandardMaterial({ color: '#6f8478', roughness: 1 })
    for (let i = 0; i < 9; i++) {
      const h = new THREE.Mesh(new THREE.ConeGeometry(70 + i * 12, 26 + (i % 4) * 14, 7), m)
      h.position.set(-820 + i * 210, 4, -760 - (i % 3) * 140)
      h.scale.set(1, 1, 0.7)
      grp.add(h)
    }
    return grp
  }, [])
  return <primitive object={g} />
}

/**
 * Kelvin wake. A flat rectangle reads as a rectangle from directly overhead, so
 * the aerial beat in chapter 4 needs a real one: two diverging foam arms, churn
 * boiling off the stern, and a turbulent centre that fades astern.
 */
const WAKE_LEN = 130
const WAKE_HALF_W = 19
const WAKE_STERN_X = -17

function Wake({ heading }: { heading: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Group>(null)
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -6,
        polygonOffsetUnits: -12,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uSwell: { value: 0.55 },
          uFoam: { value: new THREE.Color('#ffffff') },
          uWater: { value: new THREE.Color('#dff2f6') },
        },
        vertexShader: /* glsl */ `
          uniform float uTime; uniform float uSwell;
          varying vec2 vUv;
          ${gerstnerGLSL}
          void main() {
            vUv = uv;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            // the ocean plane is rotated -90 deg about X, so its wave field is (x, -z)
            vec3 d = skOceanDisp(vec2(wp.x, -wp.z), uTime, uSwell);
            wp.x += d.x;
            wp.z -= d.y;
            wp.y = d.z + 0.75;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform float uOpacity;
          uniform vec3 uFoam; uniform vec3 uWater;
          varying vec2 vUv;

          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p){
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                       mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
          }
          float fbm(vec2 p){
            float v = 0.0, a = 0.5;
            for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.07; a *= 0.5; }
            return v;
          }

          void main() {
            // t = 0 at the stern, 1 at the far end of the trail
            float t = 1.0 - vUv.x;
            float v = vUv.y * 2.0 - 1.0;
            float av = abs(v);

            // churn scrolls astern so the wake reads as being left behind
            vec2 q = vec2(t * 7.0 - uTime * 0.55, v * 3.2);
            float churn = fbm(q * 1.6);

            // a 34 m boat does not throw a tanker's Kelvin V. What reads is the
            // churned lane boiling off the transom, edged by two modest arms.
            float lane = smoothstep(0.34 + t * 0.30, 0.0, av);
            float boil = exp(-pow(t / 0.22, 2.0)) * smoothstep(0.46, 0.0, av);
            float turb = pow(max(churn - 0.30, 0.0) * 1.85, 1.10);
            float band = lane * (0.16 + 1.55 * turb);
            band *= mix(0.30, 1.0, pow(1.0 - t, 0.55));

            float arm = 0.20 + t * 0.44;
            float armW = 0.075 + t * 0.085;
            float armLine = exp(-pow((av - arm) / armW, 2.0));
            armLine *= 0.45 + 0.75 * churn;
            armLine *= mix(0.22, 1.0, pow(1.0 - t, 0.8));

            // the boil off the transom is what reads from altitude, where the
            // long trail is too diffuse to see
            float foam = band * 1.0 + armLine * 0.80 + boil * 2.20;

            // dissolve at the far end and inside the plane edge, never at the arms
            float fade = smoothstep(1.0, 0.86, t) * smoothstep(0.96, 0.80, av);
            // alpha rises faster than foam so the thin stuff disappears entirely
            // instead of veiling the water in grey
            float a = pow(clamp(foam, 0.0, 1.0), 2.2) * fade * uOpacity;
            if (a < 0.014) discard;

            vec3 col = mix(uWater, uFoam, clamp(foam * 2.4, 0.0, 1.0));
            gl_FragColor = vec4(col, a);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  )

  useFrame((state) => {
    const p = scrollRef.current
    const moving =
      smoothstep((p - ch('c03-voyage').start) / 0.06) *
      (1 - smoothstep((p - ch('c07-return').end) / 0.04))
    mat.uniforms.uTime.value = state.clock.elapsedTime
    // a slow inbound run does not throw the wake a working passage does
    mat.uniforms.uOpacity.value = 0.92 * moving * (0.42 + 0.58 * swellRef.current)
    mat.uniforms.uSwell.value = swellRef.current
    if (ref.current) {
      // the trail has to sit behind the hull whichever way she is heading
      ref.current.rotation.y = heading.current
      ref.current.visible = moving > 0.01
    }
  })

  return (
    <group ref={ref} position={[0, 0, 0]}>
      <mesh
        material={mat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[WAKE_STERN_X - WAKE_LEN / 2, 0, 0]}
      >
        <planeGeometry args={[WAKE_LEN, WAKE_HALF_W * 2, 128, 40]} />
      </mesh>
    </group>
  )
}

/** Sea spray thrown up where the gear breaks the surface. */
function Spray({
  count = 160,
  position = [0, 0, 0] as [number, number, number],
  spread = [4, 3, 4] as [number, number, number],
  size = 0.07,
  opacity = 0.5,
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread[0]
      pos[i * 3 + 1] = Math.random() * spread[1]
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread[2]
      seed[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [count, spread[0], spread[1], spread[2]])

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: opacity },
          uSize: { value: size },
          uH: { value: spread[1] },
        },
        vertexShader: `
          attribute float aSeed; uniform float uTime; uniform float uSize; uniform float uH;
          varying float vA;
          void main(){
            vec3 p = position;
            // ballistic arc: up fast, fall back, respawn
            float t = fract(uTime * (0.28 + aSeed * 0.34) + aSeed);
            float h = 4.0 * t * (1.0 - t);
            p.y = h * uH;
            p.x += (aSeed - 0.5) * t * 2.2;
            p.z += (fract(aSeed * 7.3) - 0.5) * t * 2.2;
            vA = (1.0 - t) * smoothstep(0.0, 0.12, t);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = uSize * 300.0 / max(-mv.z, 0.5) * (0.5 + aSeed);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform float uOpacity; varying float vA;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            gl_FragColor = vec4(1.0, 1.0, 1.0, smoothstep(0.5, 0.05, d) * uOpacity * clamp(vA, 0.0, 1.0));
          }`,
      }),
    [opacity, size, spread[1]],
  )
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
  })
  return <points geometry={geo} material={mat} position={position} />
}

/**
 * Chapters 5 and 6. The crew actually work the gear: a hauling team on the rail
 * bringing a full net bag over the side, a cast net in flight off the bow
 * quarter, and mixed catch landing on the deck. The baked animation is scrubbed
 * by scroll, so the reader hauls the net themselves.
 */
function FishingAction() {
  const netsCh = ch('c04-nets')
  const catchCh = ch('c05-catch')
  return (
    <group>
      <ScrubbedModel
        url="/assets/models/ocean/fishing_action.glb"
        playhead={() => {
          const p = scrollRef.current
          // the haul runs across both chapters: gear away, then catch aboard
          const a = localProgress(p, netsCh) * 0.62
          const b = 0.62 + localProgress(p, catchCh) * 0.38
          return p < netsCh.end ? a : b
        }}
      />
      <Spray count={150} position={[0.2, 0, -4.3]} spread={[3.4, 2.6, 2.6]} size={0.075} opacity={0.5} />
      <Spray count={120} position={[5.9, 0, -6.9]} spread={[4.2, 2.2, 3.4]} size={0.065} opacity={0.42} />
    </group>
  )
}

/**
 * Chapter 6. The hero catch is landed into an insulated deck bin on crushed
 * ice, laid out the way an export crew actually handles it: swordfish and tuna
 * first and clear, supporting species in a crate alongside.
 */
function CatchStation() {
  return (
    <group>
      {/* insulated bin */}
      <mesh position={[0, 0.30, 0]}>
        <boxGeometry args={[4.2, 0.60, 1.95]} />
        <meshStandardMaterial color="#eef3f4" roughness={0.52} />
      </mesh>
      <mesh position={[0, 0.615, 0]}>
        <boxGeometry args={[4.24, 0.09, 1.99]} />
        <meshStandardMaterial color="#0e6f8e" roughness={0.45} />
      </mesh>
      {/* crushed ice bed */}
      <mesh position={[0, 0.665, 0]}>
        <boxGeometry args={[4.0, 0.14, 1.78]} />
        <meshStandardMaterial color="#dceff7" roughness={0.30} metalness={0.05} />
      </mesh>
      {Array.from({ length: 22 }, (_, i) => {
        const gx = ((i * 37) % 100) / 100 - 0.5
        const gz = ((i * 61) % 100) / 100 - 0.5
        return (
          <mesh key={i} position={[gx * 3.7, 0.735, gz * 1.6]} rotation={[i * 0.7, i * 1.3, i * 0.4]}>
            <boxGeometry args={[0.17, 0.10, 0.15]} />
            <meshStandardMaterial color="#eaf7fc" roughness={0.24} />
          </mesh>
        )
      })}

      {/* heroes, laid on the ice */}
      <ModelPart
        url="/assets/models/products/swordfish_hero.glb"
        node="Swordfish_OnDeck"
        position={[0.15, 0.85, -0.42]}
        rotation={[0, 0.04, 0]}
      />
      <ModelPart
        url="/assets/models/products/tuna_hero.glb"
        node="Tuna_OnDeck"
        position={[-0.30, 0.84, 0.50]}
        rotation={[0, -0.06, 0]}
      />

      {/* supporting species, secondary, in their own crate */}
      <group position={[-3.05, 0.0, 0.30]} rotation={[0, 0.22, 0]}>
        <mesh position={[0, 0.24, 0]}>
          <boxGeometry args={[1.5, 0.48, 1.15]} />
          <meshStandardMaterial color="#12608f" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.50, 0]}>
          <boxGeometry args={[1.36, 0.10, 1.02]} />
          <meshStandardMaterial color="#dceff7" roughness={0.3} />
        </mesh>
        <Model
          url="/assets/models/products/supporting_ocean_fish.glb"
          position={[0.34, 0.58, -0.46]}
          rotation={[Math.PI / 2, 0, -0.30]}
          scale={0.46}
        />
      </group>
    </group>
  )
}

export function OceanStage({ quality }: { quality: string }) {
  const vessel = useRef<THREE.Group>(null)
  const heading = useRef(-0.1)
  const nets = useRef<THREE.Group>(null)
  const catchGrp = useRef<THREE.Group>(null)
  const actionGrp = useRef<THREE.Group>(null)
  const vesselModel = useRef<THREE.Group>(null)

  useFrame((state) => {
    const p = scrollRef.current
    const t = state.clock.elapsedTime

    // vessel heel and heave, stronger in open water
    const openBay = smoothstep((p - ch('c03-voyage').start) / 0.08) *
      (1 - smoothstep((p - ch('c07-return').start) / 0.08))
    if (vessel.current) {
      const sea = 0.25 + openBay
      vessel.current.rotation.z = Math.sin(t * 0.55) * 0.030 * sea
      vessel.current.rotation.x = Math.sin(t * 0.42 + 1.2) * 0.019 * sea
      vessel.current.position.y = 0.35 + Math.sin(t * 0.5) * 0.42 * sea
      // the vessel holds frame while the harbour recedes and the sea runs past,
      // so every shot stays composed no matter how fast the reader scrolls
      const out = smoothstep((p - ch('c02-boarding').start) / 0.12)
      const back = smoothstep((p - ch('c07-return').start) / 0.12)
      vessel.current.position.x = 0
      vessel.current.position.z = 0
      vessel.current.rotation.y = -0.10 + out * 0.06 - back * 0.06
      heading.current = vessel.current.rotation.y
    }

    // nets appear only for the casting chapter
    const nc = ch('c04-nets')
    if (nets.current) {
      const a = clamp01(
        smoothstep((p - (nc.start - 0.008)) / 0.02) - smoothstep((p - (nc.end + 0.006)) / 0.02),
      )
      nets.current.visible = a > 0.01
      nets.current.scale.setScalar(0.55 + 0.45 * a)
      nets.current.position.y = -1.2 - (1 - a) * 3
    }

    // catch reveal on deck
    const cc = ch('c05-catch')
    if (catchGrp.current) {
      const a = clamp01(
        smoothstep((p - (cc.start - 0.012)) / 0.02) - smoothstep((p - (cc.end + 0.008)) / 0.02),
      )
      catchGrp.current.visible = a > 0.01
      // the bin settles onto the deck rather than floating above it
      catchGrp.current.position.y = 2.42 + (1 - a) * 0.55
    }

    // the working sequence covers casting through the catch on deck
    const ac0 = ch('c04-nets')
    const ac1 = ch('c05-catch')
    const working = clamp01(
      smoothstep((p - (ac0.start - 0.014)) / 0.02) - smoothstep((p - (ac1.end + 0.006)) / 0.02),
    )
    if (actionGrp.current) actionGrp.current.visible = working > 0.01
    // the idle crew and the stowed net pile stand down while the gear is out,
    // otherwise the deck reads as two crews working past each other
    const vm = vesselModel.current
    if (vm) {
      const idle = vm.getObjectByName('Crew')
      const stowed = vm.getObjectByName('DeckNets')
      if (idle) idle.visible = working < 0.5
      if (stowed) stowed.visible = working < 0.5
    }
  })

  const netsCh = ch('c04-nets')

  return (
    <group>
      <Sky />
      <Ocean quality={quality} />
      <PortBackdrop />
      <Headland />
      <Wake heading={heading} />

      <group ref={vessel} position={[0, 0.35, 0]} rotation={[0, -0.1, 0]}>
        <ScrubbedModel
          groupRef={vesselModel}
          url="/assets/models/vessels/large_fishing_vessel.glb"
          playhead={() => localProgress(scrollRef.current, netsCh) * 0.42}
        />
        <group ref={catchGrp} position={[-4.8, 2.42, -1.2]}>
          <CatchStation />
        </group>
        <group ref={actionGrp} position={[2.4, 2.42, -0.6]}>
          <FishingAction />
        </group>
      </group>

      <group ref={nets} position={[-6, -1.2, -10]} rotation={[0, 0.5, 0]}>
        <ScrubbedModel
          url="/assets/models/ocean/fishing_nets_and_ropes.glb"
          playhead={() => localProgress(scrollRef.current, netsCh)}
        />
      </group>

      {/* the export vessel waiting deeper in the port */}
      <Model
        url="/assets/models/vessels/container_vessel_export.glb"
        position={[-330, 0, -430]}
        rotation={[0, 0.22, 0]}
        scale={0.9}
      />

      {/* 10 AM coastal daylight */}
      <hemisphereLight args={['#cfe9f4', '#0d5568', 0.55]} />
      <directionalLight position={[120, 150, -70]} intensity={2.4} color="#fff3df" />
      <directionalLight position={[-90, 60, 120]} intensity={0.55} color="#bfe0ec" />
      <ambientLight intensity={0.10} color="#dceef6" />
    </group>
  )
}
