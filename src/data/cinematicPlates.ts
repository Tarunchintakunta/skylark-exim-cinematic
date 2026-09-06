/**
 * The film, one entry per chapter, in order.
 *
 * A chapter can carry more than one strip: the scroll band is split across
 * them so the chapter cuts from one shot to the next. `still` is each strip's
 * opening frame at full generated resolution (2752 or 3840 wide): it paints
 * first, holds while the strip streams in, and is the whole picture for a
 * reader on reduced motion. Frames live under public/assets/frames and are
 * indexed by frames.json; src/components/FilmStrip.tsx draws them.
 *
 * Every strip came from Higgsfield. Chapters 1 to 7 are anchored to one hero
 * vessel reference so the same ship leaves Visakhapatnam, works the Bay and
 * comes home.
 */
export interface Strip {
  /** clip id: the folder under public/assets/frames/{d,m}/ and the still name */
  id: string
  alt: string
}

export interface FilmChapter {
  chapter: string
  clips: Strip[]
}

const S = '/assets/media/higgsfield/stills'
export const stillFor = (clipId: string) => `${S}/${clipId}.jpg`

export const film: FilmChapter[] = [
  { chapter: 'c01-port', clips: [{ id: 'c01-port', alt: 'A steel fishing vessel alongside the quay at Visakhapatnam, gantry cranes and container stacks behind her' }] },
  { chapter: 'c02-boarding', clips: [{ id: 'c02-boarding', alt: 'Crew boarding the vessel with nets, rope and insulated crates' }] },
  { chapter: 'c03-voyage', clips: [{ id: 'c03-voyage', alt: 'Seen from directly overhead, the vessel running alone in the Bay of Bengal with a white wake astern' }] },
  { chapter: 'c04-nets', clips: [{ id: 'c04-nets', alt: 'Crew on deck hauling a full purse-seine net in over the rail' }] },
  { chapter: 'c05-catch', clips: [{ id: 'c05-catch', alt: 'A whole swordfish and a whole yellowfin tuna on crushed ice in a stainless deck bin' }] },
  { chapter: 'c06-hold', clips: [{ id: 'c06-hold', alt: 'The catch stowed in clean onboard chilled storage' }] },
  {
    chapter: 'c07-return',
    clips: [
      { id: 'c07-return', alt: 'The vessel inbound to Visakhapatnam with the container port behind her' },
      { id: 'c07-transfer', alt: 'Dock workers loading insulated crates into a refrigerated container on the quay' },
    ],
  },
  { chapter: 'c08-intake', clips: [{ id: 'c08-intake', alt: 'The processing hall, stainless tables and workers in clean protective clothing' }] },
  { chapter: 'c09-cutting', clips: [{ id: 'c09-cutting', alt: 'A worker filleting a swordfish on a stainless table, finished steaks beside it' }] },
  { chapter: 'c10-ponds', clips: [{ id: 'c10-ponds', alt: 'A clean, organised shrimp aquaculture farm on the Andhra coast seen from the air' }] },
  {
    chapter: 'c11-shrimp',
    clips: [
      { id: 'c11-shrimp', alt: 'Workers peeling and deveining shrimp on a chilled stainless line' },
      { id: 'c11-forms', alt: 'Export shrimp product forms presented on stainless trays' },
    ],
  },
  { chapter: 'c12-qc', clips: [{ id: 'c12-qc', alt: 'A quality control inspector working in the residue testing laboratory' }] },
  { chapter: 'c13-freezing', clips: [{ id: 'c13-freezing', alt: 'Frost and glazing mist in the freezing tunnel' }] },
  { chapter: 'c14-coldstore', clips: [{ id: 'c14-coldstore', alt: 'A long aisle of pallet racking inside the cold store' }] },
  { chapter: 'c15-reefer', clips: [{ id: 'c15-reefer', alt: 'A reefer container loaded with sealed seafood cartons' }] },
  { chapter: 'c16-vessel', clips: [{ id: 'c16-vessel', alt: 'A container vessel leaving Visakhapatnam in deep blue water' }] },
]

/** every strip in scroll order, with the chapter it belongs to */
export const strips = film.flatMap((f) => f.clips.map((c) => ({ ...c, chapter: f.chapter })))

// the old name, kept so nothing else has to change today
export const cinematicPlates = strips.map((s) => ({ chapter: s.chapter, still: stillFor(s.id), alt: s.alt }))
