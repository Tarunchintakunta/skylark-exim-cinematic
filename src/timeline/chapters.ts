import type { LucideIcon } from 'lucide-react'
import {
  Anchor, Users, Waves, Network, Fish, Snowflake, Ship, Factory, Slice, Droplets,
  Layers, FlaskConical, ThermometerSnowflake, Package, Container, Sailboat, Globe2, Send,
} from 'lucide-react'

export type StageId =
  | 'film' | 'ocean' | 'hold' | 'quay' | 'plant' | 'ponds' | 'qc' | 'freeze'
  | 'coldstore' | 'docs' | 'reefer' | 'fleet' | 'globe'

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
  /** a hairline data row under the copy */
  facts?: string[]
  /** a second data row, for a chapter that carries two kinds of detail */
  detail?: string[]
  icon: LucideIcon
  /** normalised scroll range, filled in below */
  start: number
  end: number
}

/**
 * Eighteen chapters, one continuous cold chain: origin, catch, cold chain,
 * processing, quality, freezing, packing, export, delivery, then the quote.
 *
 * Copy is captions, not paragraphs. The film carries the picture; a line of
 * copy names what is on screen and the data row states the fact a buyer needs.
 */
const raw: Omit<Chapter, 'start' | 'end' | 'index'>[] = [
  {
    id: 'c01-port', num: '01', nav: 'Port', stage: 'film', weight: 1.3,
    eyebrow: 'Visakhapatnam · 10:00',
    title: 'Caught in the Bay. Delivered to the world.',
    lines: ['Swordfish and tuna from the Bay of Bengal. Shrimp from the ponds of the Andhra coast.'],
    facts: ['Two Origins. One Standard.'],
    icon: Anchor,
  },
  {
    id: 'c02-boarding', num: '02', nav: 'Boarding', stage: 'film', weight: 1.0,
    eyebrow: 'Boarding the vessel',
    title: 'The Bay is not a supplier. It is a test.',
    lines: ['Crew, nets, insulated crates and flake ice go aboard before the harbour wakes.'],
    facts: ['Nets', 'Insulated crates', 'Flake ice'],
    icon: Users,
  },
  {
    id: 'c03-voyage', num: '03', nav: 'The Bay', stage: 'film', weight: 1.5,
    eyebrow: 'Bay of Bengal',
    title: 'Where the ocean gives only once.',
    lines: ['Ninety nautical miles out. Blue-green water and a horizon with nothing on it.'],
    facts: ['Bay of Bengal', 'Andhra coast', 'Open water'],
    icon: Waves,
  },
  {
    id: 'c04-nets', num: '04', nav: 'Nets', stage: 'film', weight: 1.4,
    eyebrow: 'Nets over the rail',
    title: 'The catch begins with timing.',
    lines: ['Gear goes over on the mark. The net comes back heavy, or it comes back empty.'],
    facts: ['Purse seine', 'Hauled on deck', 'Sorted at the rail'],
    icon: Network,
  },
  {
    id: 'c05-catch', num: '05', nav: 'The Catch', stage: 'film', weight: 1.4,
    eyebrow: 'Hero catch',
    title: 'Swordfish and tuna are the heroes of the ocean route.',
    lines: ['On ice within minutes of the rail. Handled for export from the first moment on deck.'],
    facts: ['Swordfish', 'Tuna', 'Seer', 'Mackerel', 'Pomfret', 'Snapper'],
    icon: Fish,
  },
  {
    id: 'c06-hold', num: '06', nav: 'Chilled Hold', stage: 'film', weight: 1.0,
    eyebrow: 'Onboard chilled storage',
    title: 'The cold chain starts at sea.',
    lines: ['Iced and stowed before the harbour appears.'],
    facts: ['Hold −1 °C', 'Iced on deck', 'Lot tagged'],
    icon: Snowflake,
  },
  {
    id: 'c07-return', num: '07', nav: 'Return', stage: 'film', weight: 1.4,
    eyebrow: 'Return to Vizag · cold-chain transfer',
    title: 'The standard continues on land.',
    lines: ['Vessel hold to insulated container to plant door. One unbroken chain.'],
    facts: ['Transfer −1 °C', 'Unbroken chain'],
    icon: Ship,
  },
  {
    id: 'c08-intake', num: '08', nav: 'Plant', stage: 'film', weight: 1.0,
    eyebrow: 'Processing facility',
    title: 'Every product earns the next room.',
    lines: ['Intake, inspection, accepted and rejected. Both origins face the same door.'],
    facts: ['Intake inspection', 'Both origins'],
    icon: Factory,
  },
  {
    id: 'c09-cutting', num: '09', nav: 'Cutting', stage: 'film', weight: 1.2,
    eyebrow: 'Cutting, filleting, portioning',
    title: 'Skill turns ocean scale into buyer specification.',
    lines: ['Swordfish and tuna are loined, trimmed and portioned to spec on stainless.'],
    facts: ['Loins', 'Steaks', 'Portions', 'Trimmed to spec'],
    icon: Slice,
  },
  {
    id: 'c10-ponds', num: '10', nav: 'Ponds', stage: 'film', weight: 1.2,
    eyebrow: 'Second origin · Andhra coast',
    title: 'The pond is a controlled history.',
    lines: ['Water, inputs, harvest date, batch identity. Recorded before a carton exists.'],
    facts: ['Registered ponds', 'Logged inputs', 'Traceable batches'],
    icon: Droplets,
  },
  {
    id: 'c11-shrimp', num: '11', nav: 'Shrimp', stage: 'film', weight: 1.6,
    eyebrow: 'Shrimp processing · product forms · grading',
    title: 'A buyer who names a form is naming a promise of consistency.',
    lines: ['Peeled, deveined and graded by hand and by count, to the same finish every time.'],
    facts: ['HOSO', 'HLSO', 'PUD', 'PTO'],
    detail: ['10/20', '21/25', '26/30', '31/40', '41/50'],
    icon: Layers,
  },
  {
    id: 'c12-qc', num: '12', nav: 'QC', stage: 'film', weight: 1.3,
    eyebrow: 'Quality control · residue testing',
    title: 'Every batch is tested before it ships.',
    lines: ['Nitrofurans, chloramphenicol, tetracyclines. Against EU and US limits, whichever is stricter.'],
    facts: ['HACCP', 'EIC', 'Every batch', 'EU / US limits'],
    icon: FlaskConical,
  },
  {
    id: 'c13-freezing', num: '13', nav: 'Freezing', stage: 'film', weight: 1.2,
    eyebrow: 'Freezing, glazing, packing',
    title: 'Where time stops.',
    lines: ['A clean glaze protects the journey and releases the moment the buyer needs it.'],
    facts: ['IQF freezing', 'Block freezing', 'Blast freezing', 'Glazing'],
    icon: ThermometerSnowflake,
  },
  {
    id: 'c14-coldstore', num: '14', nav: 'Cold Store', stage: 'film', weight: 1.1,
    eyebrow: 'Cold storage',
    title: 'A carton is not packaging. It is proof.',
    lines: ['Weighed, labelled, sealed and allocated before a container window opens.'],
    facts: ['−18 °C to −20 °C', '700 pallets', 'Batch tracked'],
    icon: Package,
  },
  {
    id: 'c15-reefer', num: '15', nav: 'Reefer', stage: 'film', weight: 1.3,
    eyebrow: 'Reefer loading · export documentation',
    title: 'The promise is now under seal.',
    lines: ['Temperature set, doors closed, seal bar down. The paperwork travels with the container.'],
    facts: ['Reefer −20 °C', '40 ft ISO'],
    detail: ['Health certificate', 'Packing list', 'Certificate of origin', 'Residue certificate', 'Compliance records'],
    icon: Container,
  },
  {
    id: 'c16-vessel', num: '16', nav: 'Vessel', stage: 'film', weight: 1.1,
    eyebrow: 'Container vessel',
    title: "From Visakhapatnam to the world's table.",
    lines: ['Containers align like a grid, then the Bay opens ahead.'],
    icon: Sailboat,
  },
  {
    id: 'c17-routes', num: '17', nav: 'Routes', stage: 'globe', weight: 1.3,
    eyebrow: 'Global routes',
    title: 'From this shore to yours.',
    lines: ['Europe, the Gulf, East Asia and North America.'],
    facts: ['Rotterdam', 'Dubai', 'Tokyo', 'New York'],
    icon: Globe2,
  },
  {
    id: 'c18-rfq', num: '18', nav: 'RFQ', stage: 'globe', weight: 1.8,
    eyebrow: 'Request export quote',
    title: 'Name the product. We will answer with the specification.',
    lines: ['Tell us the product, the form, the grade and the destination.'],
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
