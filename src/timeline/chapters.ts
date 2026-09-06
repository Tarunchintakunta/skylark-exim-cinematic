import type { LucideIcon } from 'lucide-react'
import {
  Anchor, Users, Compass, Waves, Network, Fish, Snowflake, Ship, Truck,
  Factory, Slice, Droplets, Layers, Scale, FlaskConical, ThermometerSnowflake,
  Package, FileCheck2, Container, Sailboat, Globe2, Send,
} from 'lucide-react'

export type StageId =
  | 'ocean' | 'hold' | 'quay' | 'plant' | 'ponds' | 'qc'
  | 'freeze' | 'coldstore' | 'docs' | 'reefer' | 'fleet' | 'globe'

export interface Chapter {
  id: string
  index: number
  num: string
  nav: string
  stage: StageId
  /** relative scroll weight; 1 = one standard chapter length */
  weight: number
  eyebrow: string
  title: string
  lines: string[]
  facts?: string[]
  icon: LucideIcon
  /** normalised scroll range, filled in below */
  start: number
  end: number
}

const raw: Omit<Chapter, 'start' | 'end' | 'index'>[] = [
  {
    id: 'ch01-opening-port', num: '01', nav: 'Port', stage: 'ocean', weight: 1.3,
    eyebrow: 'Visakhapatnam · 10:00 AM',
    title: 'A shipment begins long before the container is sealed.',
    lines: ['Skylark Exim works the Bay of Bengal and the aquaculture ponds of the Andhra coast.'],
    facts: ['Two Origins. One Standard.'],
    icon: Anchor,
  },
  {
    id: 'ch02-boarding', num: '02', nav: 'Boarding', stage: 'ocean', weight: 1.0,
    eyebrow: 'Boarding the vessel',
    title: 'The Bay is not a supplier. It is a test.',
    lines: ['Crew, nets, insulated crates and ice go aboard before the harbour wakes fully.'],
    icon: Users,
  },
  {
    id: 'ch03-compass', num: '03', nav: 'Compass', stage: 'ocean', weight: 1.1,
    eyebrow: 'Conditions',
    title: 'Time. Temperature. Direction. Discipline.',
    lines: ['Every outbound leg is logged against sea state, heading and hold temperature.'],
    icon: Compass,
  },
  {
    id: 'ch04-into-the-bay', num: '04', nav: 'The Bay', stage: 'ocean', weight: 1.6,
    eyebrow: 'Into the Bay of Bengal',
    title: 'Where the ocean gives only once.',
    lines: [
      'Blue-green open water, ninety nautical miles off the Andhra coast.',
      'One vessel, one crew, and a catch that has to be worth the run home.',
    ],
    icon: Waves,
  },
  {
    id: 'ch05-nets', num: '05', nav: 'Nets', stage: 'ocean', weight: 1.5,
    eyebrow: 'Nets into the water',
    title: 'The catch begins with timing.',
    lines: [
      'Gear goes over on the mark, not on the hour.',
      'Cast net away, haul line tight, and the Bay decides the rest.',
    ],
    icon: Network,
  },
  {
    id: 'ch06-swordfish-and-tuna', num: '06', nav: 'The Catch', stage: 'ocean', weight: 1.3,
    eyebrow: 'Hero catch',
    title: 'Swordfish and tuna are the heroes of the ocean route.',
    lines: ['Handled for export from the first moment on deck.'],
    facts: ['Swordfish', 'Tuna', 'Seer', 'Mackerel', 'Pomfret', 'Snapper'],
    icon: Fish,
  },
  {
    id: 'ch07-onboard-cold-storage', num: '07', nav: 'Chilled Hold', stage: 'hold', weight: 1.1,
    eyebrow: 'Onboard chilled storage',
    title: 'The cold chain starts at sea.',
    lines: ['Freshness is protected before the harbour appears.'],
    facts: ['Hold −1.0 °C', 'Lot BOB-1142', 'Iced on deck'],
    icon: Snowflake,
  },
  {
    id: 'ch08-return-to-port', num: '08', nav: 'Return', stage: 'ocean', weight: 1.0,
    eyebrow: 'Return to Vizag',
    title: 'The catch returns to the coast.',
    lines: ['The standard continues on land.'],
    icon: Ship,
  },
  {
    id: 'ch09-cold-chain-transfer', num: '09', nav: 'Transfer', stage: 'quay', weight: 1.0,
    eyebrow: 'Cold-chain transfer',
    title: 'From vessel hold to cold-chain transfer.',
    lines: ['One insulated container is the hero object from quay to plant door.'],
    facts: ['Transfer −1 °C', 'Unbroken chain'],
    icon: Truck,
  },
  {
    id: 'ch10-processing-arrival', num: '10', nav: 'Plant', stage: 'plant', weight: 1.0,
    eyebrow: 'Processing facility',
    title: 'Every product earns the next room.',
    lines: ['Intake, inspection, accepted and rejected. Both origins face the same door.'],
    icon: Factory,
  },
  {
    id: 'ch11-cutting', num: '11', nav: 'Portions', stage: 'plant', weight: 1.0,
    eyebrow: 'Cutting and portioning',
    title: 'Skill turns ocean scale into buyer specification.',
    lines: ['Swordfish and tuna are cleaned, cut and portioned to spec on stainless.'],
    icon: Slice,
  },
  {
    id: 'ch12-pond-origin', num: '12', nav: 'Ponds', stage: 'ponds', weight: 1.2,
    eyebrow: 'Second origin · Andhra coast',
    title: 'The pond is a controlled history.',
    lines: ['Water. Inputs. Harvest. Batch identity.', 'A wild shrimp has a history we inspect. A farmed shrimp has a history we own.'],
    facts: ['Registered ponds', 'Logged inputs', 'Batch AP-2291'],
    icon: Droplets,
  },
  {
    id: 'ch13-product-forms', num: '13', nav: 'Forms', stage: 'ponds', weight: 1.2,
    eyebrow: 'Shrimp product forms',
    title: 'A buyer who names a form is naming a promise of consistency.',
    lines: ['Head-on shell-on through peeled tail-on, to the same finish.'],
    facts: ['HOSO', 'HLSO', 'PUD', 'PTO'],
    icon: Layers,
  },
  {
    id: 'ch14-grading', num: '14', nav: 'Grading', stage: 'plant', weight: 1.1,
    eyebrow: 'Grading and sorting',
    title: 'The number on the label is an agreement.',
    lines: ['Technology separates it. Experience confirms it.'],
    facts: ['10/20', '21/25', '26/30', '31/40', '41/50'],
    icon: Scale,
  },
  {
    id: 'ch15-qc-and-residue-testing', num: '15', nav: 'QC', stage: 'qc', weight: 1.5,
    eyebrow: 'Quality control and residue testing',
    title: 'Trust is not a claim. It is a result.',
    lines: [
      'Nitrofurans. Chloramphenicol. Tetracyclines.',
      'Every batch is tested before shipment, against EU and US limits, whichever is stricter.',
      'The certificate travels with the carton.',
    ],
    facts: ['HACCP', 'EIC', 'Every batch', 'EU / US limits'],
    icon: FlaskConical,
  },
  {
    id: 'ch16-freezing-and-glazing', num: '16', nav: 'Freezing', stage: 'freeze', weight: 1.3,
    eyebrow: 'Freezing and glazing',
    title: 'Where time stops.',
    lines: ['A clean glaze protects the journey and releases the moment the buyer needs it.'],
    facts: ['IQF freezing', 'Block freezing', 'Blast freezing', 'Glazing'],
    icon: ThermometerSnowflake,
  },
  {
    id: 'ch17-packing-and-cold-storage', num: '17', nav: 'Cold Store', stage: 'coldstore', weight: 1.2,
    eyebrow: 'Packing and cold storage',
    title: 'A carton is not packaging. It is proof.',
    lines: ['Filled to specification, weighed, labelled, sealed and allocated before a container window opens.'],
    facts: ['−18 °C to −20 °C', '700 pallets', 'Batch tracked'],
    icon: Package,
  },
  {
    id: 'ch18-export-documents', num: '18', nav: 'Documents', stage: 'docs', weight: 1.1,
    eyebrow: 'Export documentation',
    title: 'A shipment moves on paperwork that is correct.',
    lines: ['A shipment that fails at customs has failed the buyer as completely as one that fails at quality control.'],
    facts: ['Health certificate', 'Packing list', 'Certificate of origin', 'Residue certificate', 'Compliance records', 'HACCP', 'EIC'],
    icon: FileCheck2,
  },
  {
    id: 'ch19-reefer-containers', num: '19', nav: 'Reefer', stage: 'reefer', weight: 1.1,
    eyebrow: 'Reefer container loading',
    title: 'The promise is now under seal.',
    lines: ['Temperature set. Doors closed. Seal bar down.'],
    facts: ['Reefer set −20 °C', '40 ft ISO'],
    icon: Container,
  },
  {
    id: 'ch20-container-vessel', num: '20', nav: 'Vessel', stage: 'fleet', weight: 1.1,
    eyebrow: 'Container vessel departure',
    title: "From Visakhapatnam to the world's table.",
    lines: ['Containers align like a precise grid, then the Bay opens ahead.'],
    icon: Sailboat,
  },
  {
    id: 'ch21-globe-and-routes', num: '21', nav: 'Routes', stage: 'globe', weight: 1.3,
    eyebrow: 'Global routes',
    title: 'From this shore to yours.',
    lines: ['Two origins. One standard.'],
    icon: Globe2,
  },
  {
    id: 'ch22-rfq', num: '22', nav: 'RFQ', stage: 'globe', weight: 1.8,
    eyebrow: 'Request export quote',
    title: 'Every step protects a promise.',
    lines: ['Tell us the product, the form, the grade and the destination. We will answer with specification and documentation.'],
    icon: Send,
  },
]

const totalWeight = raw.reduce((s, c) => s + c.weight, 0)

let acc = 0
export const chapters: Chapter[] = raw.map((c, index) => {
  const start = acc / totalWeight
  acc += c.weight
  return { ...c, index, start, end: acc / totalWeight }
})

/** Scroll height per unit weight, in viewport heights. */
export const VH_PER_WEIGHT = 175
export const TOTAL_SCROLL_VH = Math.round(totalWeight * VH_PER_WEIGHT)

export const chapterAt = (p: number): Chapter => {
  for (const c of chapters) if (p < c.end) return c
  return chapters[chapters.length - 1]
}

/** 0..1 progress within a chapter. */
export const localProgress = (p: number, c: Chapter) =>
  Math.min(1, Math.max(0, (p - c.start) / (c.end - c.start)))

/** Smooth 0..1..0 window used to fade scenes and copy. */
export const windowed = (p: number, start: number, end: number, fade = 0.12) => {
  const span = end - start
  const f = Math.min(fade * span, span * 0.45)
  if (p <= start - f || p >= end + f) return 0
  if (p < start + f) return smoothstep((p - (start - f)) / (2 * f))
  if (p > end - f) return 1 - smoothstep((p - (end - f)) / (2 * f))
  return 1
}

export const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
