/**
 * Cinematic plates: the film cuts.
 *
 * Each entry dissolves a photoreal plate over the WebGL scene for a beat inside
 * its chapter, then dissolves back. The plates were rendered by Higgsfield from
 * Blender collector frames shot on the exact camera the chapter uses, so the cut
 * lands on the same framing instead of jumping.
 */
export interface CinematicPlate {
  /** chapter id this plate belongs to */
  chapter: string
  /** still frame, always present, also used as the video poster */
  still: string
  /** motion loop, when one was generated */
  video?: string
  /** fraction of the chapter where the plate starts rising */
  from: number
  /** fraction of the chapter where the plate has fully dissolved away */
  to: number
  /** peak opacity, 1 is a full cut to film */
  peak: number
  /** short caption for accessibility */
  alt: string
}

const S = '/assets/media/higgsfield/stills'
const V = '/assets/media/higgsfield/video'

export const cinematicPlates: CinematicPlate[] = [
  {
    chapter: 'ch01-opening-port',
    still: `${S}/ch01-opening-port.jpg`,
    video: `${V}/ch01-opening-port.mp4`,
    from: 0.52, to: 0.95, peak: 1,
    alt: 'A large Indian fishing vessel at Visakhapatnam port in morning sunlight',
  },
  {
    chapter: 'ch02-boarding',
    still: `${S}/ch02-boarding.jpg`,
    from: 0.46, to: 0.94, peak: 1,
    alt: 'Fishing crew boarding the vessel with nets and insulated crates',
  },
  {
    chapter: 'ch05-nets',
    still: `${S}/ch05-crew-hauling.jpg`,
    video: `${V}/ch05-crew-hauling.mp4`,
    from: 0.34, to: 0.96, peak: 1,
    alt: 'The crew haul a full net of mixed catch over the rail while a cast net opens over the sea',
  },
  {
    chapter: 'ch06-swordfish-and-tuna',
    still: `${S}/ch06-catch.jpg`,
    video: `${V}/ch06-catch.mp4`,
    from: 0.56, to: 0.94, peak: 1,
    alt: 'Swordfish and tuna resting on crushed ice in a clean deck bin',
  },
  {
    chapter: 'ch07-onboard-cold-storage',
    still: `${S}/ch07-chilled-hold.jpg`,
    video: `${V}/ch07-chilled-hold.mp4`,
    from: 0.54, to: 0.94, peak: 1,
    alt: 'The catch stowed in clean onboard chilled storage',
  },
  {
    chapter: 'ch09-cold-chain-transfer',
    still: `${S}/ch09-transfer.jpg`,
    video: `${V}/ch09-transfer.mp4`,
    from: 0.50, to: 0.94, peak: 1,
    alt: 'Cold-chain transfer on the quay at Visakhapatnam',
  },
  {
    chapter: 'ch10-processing-arrival',
    still: `${S}/ch10-processing.jpg`,
    video: `${V}/ch10-processing.mp4`,
    from: 0.50, to: 0.94, peak: 1,
    alt: 'The processing hall, stainless tables and workers in clean protective clothing',
  },
  {
    chapter: 'ch12-pond-origin',
    still: `${S}/ch12-ponds.jpg`,
    video: `${V}/ch12-ponds.mp4`,
    from: 0.52, to: 0.94, peak: 1,
    alt: 'Aquaculture ponds along the Andhra coast seen from the air',
  },
  {
    chapter: 'ch13-product-forms',
    still: `${S}/ch13-product-forms.jpg`,
    from: 0.56, to: 0.94, peak: 1,
    alt: 'Export shrimp product forms presented on stainless trays',
  },
  {
    chapter: 'ch15-qc-and-residue-testing',
    still: `${S}/ch15-qc.jpg`,
    video: `${V}/ch15-qc.mp4`,
    from: 0.60, to: 0.95, peak: 1,
    alt: 'A quality control inspector working in the residue testing laboratory',
  },
  {
    chapter: 'ch16-freezing-and-glazing',
    still: `${S}/ch16-freezing.jpg`,
    video: `${V}/ch16-freezing.mp4`,
    from: 0.54, to: 0.94, peak: 1,
    alt: 'Frost and glazing mist in the freezing tunnel',
  },
  {
    chapter: 'ch17-packing-and-cold-storage',
    still: `${S}/ch17-cold-storage.jpg`,
    video: `${V}/ch17-cold-storage.mp4`,
    from: 0.54, to: 0.94, peak: 1,
    alt: 'A long aisle of pallet racking inside the cold store',
  },
  {
    chapter: 'ch18-export-documents',
    still: `${S}/ch18-documents.jpg`,
    from: 0.52, to: 0.94, peak: 1,
    alt: 'Export certificates and compliance papers assembled on the documentation desk',
  },
  {
    chapter: 'ch19-reefer-containers',
    still: `${S}/ch19-reefer.jpg`,
    video: `${V}/ch19-reefer.mp4`,
    from: 0.52, to: 0.94, peak: 1,
    alt: 'A reefer container loaded with sealed seafood cartons',
  },
  {
    chapter: 'ch20-container-vessel',
    still: `${S}/ch20-container-vessel.jpg`,
    video: `${V}/ch20-container-vessel.mp4`,
    from: 0.52, to: 0.94, peak: 1,
    alt: 'A container vessel leaving Visakhapatnam in deep blue water',
  },
]

export const plateFor = (chapterId: string) =>
  cinematicPlates.find((p) => p.chapter === chapterId)
