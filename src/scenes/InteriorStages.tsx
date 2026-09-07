import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { ScrubbedModel, Model } from './kit'
import { scrollRef } from '@/store/useStore'
import { chapters, clamp01, localProgress, smoothstep } from '@/timeline/chapters'
import { asset } from '@/lib/asset'

const ch = (id: string) => chapters.find((c) => c.id === id)!

/** Cheap volumetric-ish particle field: frost, glaze mist, cold vapour, spray. */
function Particles({
  count = 240,
  box = [10, 3, 6] as [number, number, number],
  color = '#ffffff',
  size = 0.05,
  rise = 0.25,
  opacity = 0.55,
  position = [0, 0, 0] as [number, number, number],
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * box[0]
      pos[i * 3 + 1] = Math.random() * box[1]
      pos[i * 3 + 2] = (Math.random() - 0.5) * box[2]
      seed[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [count, box[0], box[1], box[2]])

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uSize: { value: size },
          uOpacity: { value: opacity },
          uRise: { value: rise },
          uH: { value: box[1] },
        },
        vertexShader: `
          attribute float aSeed; uniform float uTime; uniform float uSize; uniform float uRise; uniform float uH;
          varying float vA;
          void main(){
            vec3 p = position;
            p.y = mod(p.y + uTime * uRise * (0.4 + aSeed), uH);
            p.x += sin(uTime * (0.3 + aSeed * 0.6) + aSeed * 12.0) * 0.22;
            p.z += cos(uTime * (0.25 + aSeed * 0.5) + aSeed * 9.0) * 0.22;
            vA = 1.0 - abs(p.y / uH - 0.5) * 1.6;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = uSize * 320.0 / max(-mv.z, 0.5) * (0.6 + aSeed);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform vec3 uColor; uniform float uOpacity; varying float vA;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.06, d) * uOpacity * clamp(vA, 0.0, 1.0);
            gl_FragColor = vec4(uColor, a);
          }`,
      }),
    [color, size, opacity, rise, box[1]],
  )

  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime
  })

  return <points geometry={geo} material={mat} position={position} />
}

export function HoldStage() {
  const hold = ch('c06-hold')
  return (
    <group>
      <ScrubbedModel
        url={asset("/assets/models/ocean/onboard_chilled_storage.glb")}
        playhead={() => 0.18 + localProgress(scrollRef.current, hold) * 0.25}
      />
      <Particles count={180} box={[5.4, 2.6, 4.4]} color="#cfe9f5" size={0.035} rise={0.18} opacity={0.35} position={[0, 0.3, 0]} />
      <hemisphereLight args={['#eaf6ff', '#8ba3ad', 0.60]} />
      <ambientLight intensity={0.20} color="#dceaf2" />
      <directionalLight position={[-4, 6, 4]} intensity={1.2} color="#eaf6ff" />
      {[-1.6, 1.6].map((x) =>
        [-1.2, 1.2].map((z) => (
          <pointLight key={`${x}:${z}`} position={[x, 2.7, z]} intensity={13} distance={9} color="#ddeeff" />
        )),
      )}
    </group>
  )
}

export function QuayStage() {
  const c = ch('c07-return')
  return (
    <group>
      <ScrubbedModel
        url={asset("/assets/models/export/port_transfer_system.glb")}
        playhead={() => localProgress(scrollRef.current, c)}
      />
      <hemisphereLight args={['#cfe6f0', '#7d8a86', 0.55]} />
      <directionalLight position={[26, 34, 18]} intensity={2.4} color="#fff4e2" />
    </group>
  )
}

export function PlantStage() {
  const arrival = ch('c08-intake')
  return (
    <group>
      <ScrubbedModel
        url={asset("/assets/models/processing/processing_facility.glb")}
        playhead={() => clamp01(localProgress(scrollRef.current, arrival) * 0.55)}
      />
      <hemisphereLight args={['#f4fbff', '#93a6ad', 0.66]} />
      <ambientLight intensity={0.20} color="#e8f2f6" />
      <directionalLight position={[-8, 9, 6]} intensity={1.5} color="#ffffff" />
      {[-9, -3, 3, 9].map((x) =>
        [-4.5, 4.5].map((z) => (
          <pointLight
            key={`${x}:${z}`}
            position={[x, 4.5, z]}
            intensity={48}
            distance={20}
            color="#f4fbff"
          />
        )),
      )}
    </group>
  )
}

export function PondsStage() {
  const pond = ch('c10-ponds')
  const forms = useRef<THREE.Group>(null)
  useFrame(() => {
    const p = scrollRef.current
    const fc = ch('c11-shrimp')
    if (forms.current) {
      const a = clamp01(
        smoothstep((p - (fc.start - 0.02)) / 0.03) - smoothstep((p - (fc.end + 0.01)) / 0.03),
      )
      forms.current.visible = a > 0.01
      forms.current.position.y = 1.02 + (1 - a) * 0.5
    }
  })
  return (
    <group>
      <ScrubbedModel
        url={asset("/assets/models/ponds/andhra_pond_grid.glb")}
        playhead={() => localProgress(scrollRef.current, pond)}
      />
      {/* product-form display, clear of the pond sampling station */}
      <group ref={forms} position={[-30, 1.16, 4]} scale={0.62}>
        <Model url={asset("/assets/models/products/shrimp_product_forms.glb")} rotation={[0, Math.PI / 2, 0]} />
        <mesh position={[0, -0.10, 0]}>
          <boxGeometry args={[9.6, 0.14, 3.0]} />
          <meshStandardMaterial color="#c8d2d6" roughness={0.28} metalness={0.85} />
        </mesh>
        <mesh position={[0, -0.72, 0]}>
          <boxGeometry args={[9.0, 1.1, 2.4]} />
          <meshStandardMaterial color="#e6ecee" roughness={0.55} metalness={0.1} />
        </mesh>
      </group>
      <hemisphereLight args={['#cfe6f0', '#87816a', 0.60]} />
      <directionalLight position={[60, 90, 40]} intensity={2.6} color="#fff3dd" />
    </group>
  )
}

export function QCStage() {
  const c = ch('c12-qc')
  return (
    <group>
      <ScrubbedModel
        url={asset("/assets/models/qc/qc_lab_station.glb")}
        playhead={() => localProgress(scrollRef.current, c)}
      />
      <hemisphereLight args={['#f6fbff', '#9aacb3', 0.64]} />
      <ambientLight intensity={0.24} color="#eef5f8" />
      <directionalLight position={[-3, 6, 4]} intensity={1.3} color="#ffffff" />
      {[-3, 0, 3].map((x) => (
        <pointLight key={x} position={[x, 3.0, 0.4]} intensity={26} distance={13} color="#ffffff" />
      ))}
      <pointLight position={[2.6, 1.9, -1.4]} intensity={12} distance={7} color="#ffffff" />
    </group>
  )
}

export function FreezeStage() {
  const c = ch('c13-freezing')
  return (
    <group>
      <ScrubbedModel
        url={asset("/assets/models/cold-chain/freezing_glazing_system.glb")}
        playhead={() => localProgress(scrollRef.current, c)}
      />
      {/* frost along the IQF tunnel */}
      <Particles count={420} box={[17, 2.6, 3.4]} color="#dff2ff" size={0.03} rise={0.30} opacity={0.5} position={[0, 1.1, -2.5]} />
      {/* glazing mist at the spray station */}
      <Particles count={260} box={[2.4, 2.2, 2.8]} color="#ffffff" size={0.05} rise={-0.22} opacity={0.42} position={[9, 0.9, -2.5]} />
      {/* cold vapour rolling off the blast cabinets */}
      <Particles count={200} box={[14, 1.4, 3.0]} color="#cfe6f2" size={0.09} rise={0.10} opacity={0.24} position={[-1, 0.3, 2.6]} />
      <hemisphereLight args={['#f2fbff', '#8fa6b0', 0.62]} />
      <ambientLight intensity={0.22} color="#e4f1fb" />
      <directionalLight position={[-6, 8, 6]} intensity={1.4} color="#f6fbff" />
      {[-8, -3, 2, 7].map((x) => (
        <pointLight key={x} position={[x, 4.3, 2.5]} intensity={55} distance={22} color="#eaf7ff" />
      ))}
      <pointLight position={[9, 3.6, -2.5]} intensity={40} distance={16} color="#ffffff" />
      <pointLight position={[-2, 3.4, -4.0]} intensity={35} distance={16} color="#e8f6ff" />
    </group>
  )
}

export function ColdStoreStage() {
  const c = ch('c14-coldstore')
  return (
    <group>
      <ScrubbedModel
        url={asset("/assets/models/cold-chain/cold_storage_700_pallets.glb")}
        playhead={() => localProgress(scrollRef.current, c) * 0.42}
      />
      <Particles count={200} box={[36, 5, 20]} color="#cfe4f2" size={0.10} rise={0.06} opacity={0.14} position={[0, 1, 0]} />
      <ambientLight intensity={0.22} color="#dae9f4" />
      <directionalLight position={[-20, 10, 6]} intensity={1.2} color="#eaf5ff" />
      {[-14, -4, 6, 16].map((x) => (
        <pointLight key={x} position={[x, 8.2, 0]} intensity={70} distance={26} color="#e6f3ff" />
      ))}
    </group>
  )
}

export function DocsStage() {
  const c = ch('c15-reefer')
  return (
    <group>
      <ScrubbedModel
        url={asset("/assets/models/export/export_documents.glb")}
        playhead={() => localProgress(scrollRef.current, c)}
      />
      <ambientLight intensity={0.30} color="#f0f6f8" />
      <directionalLight position={[-2, 4, 3]} intensity={2.2} color="#ffffff" />
      <pointLight position={[1.6, 2.0, 1.6]} intensity={7} distance={8} color="#ffffff" />
    </group>
  )
}

export function ReeferStage() {
  const c = ch('c15-reefer')
  return (
    <group>
      <ScrubbedModel
        url={asset("/assets/models/containers/reefer_container.glb")}
        playhead={() => localProgress(scrollRef.current, c)}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#8f9a99" roughness={0.95} />
      </mesh>
      <Model url={asset("/assets/models/export/port_transfer_system.glb")} position={[-4, 0.02, 26]} rotation={[0, Math.PI, 0]} scale={1} />
      <hemisphereLight args={['#cfe6f0', '#7d8a86', 0.55]} />
      <directionalLight position={[24, 30, 16]} intensity={2.4} color="#fff2dd" />
    </group>
  )
}

export function FleetStage() {
  const ship = useRef<THREE.Group>(null)
  const fleetCh = ch('c16-vessel')
  useFrame((s) => {
    const p = localProgress(scrollRef.current, fleetCh)
    if (ship.current) {
      ship.current.position.x = -p * 180
      ship.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.32) * 0.006
      ship.current.position.y = Math.sin(s.clock.elapsedTime * 0.28) * 0.5
    }
  })
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[2600, 2600]} />
        <meshStandardMaterial color="#0d5b74" roughness={0.15} metalness={0.1} />
      </mesh>
      <group ref={ship}>
        <Model url={asset("/assets/models/vessels/container_vessel_export.glb")} />
      </group>
      <hemisphereLight args={['#bfe0ec', '#0a4457', 0.55]} />
      <directionalLight position={[180, 260, 140]} intensity={2.8} color="#fff3e0" />
    </group>
  )
}

export function GlobeStage() {
  const g = useRef<THREE.Group>(null)
  useFrame((s) => {
    const p = scrollRef.current
    const gp = localProgress(p, ch('c17-routes'))
    if (g.current) {
      // hold Visakhapatnam toward the camera: the routes have to be seen
      // leaving India, not the far side of the Atlantic
      g.current.rotation.y = -2.85 + gp * 0.5 + s.clock.elapsedTime * 0.012
      g.current.rotation.x = 0.16
    }
  })
  return (
    <group>
      <group ref={g}>
        <Model url={asset("/assets/models/export/globe_routes_from_india.glb")} />
      </group>
      <ambientLight intensity={0.16} color="#9fc8dc" />
      {/* the key sits off-axis so the sphere keeps a terminator; a light straight
          down the lens flattened the continents into the sky */}
      <directionalLight position={[6, 9, 14]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-8, 2, 6]} intensity={34} distance={40} color="#2fa889" />
      <pointLight position={[8, -4, -6]} intensity={26} distance={40} color="#0e6f8e" />
    </group>
  )
}
