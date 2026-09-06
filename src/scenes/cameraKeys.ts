import { chapters, type StageId } from '@/timeline/chapters'

export interface CamKey {
  p: number
  stage: StageId
  pos: [number, number, number]
  target: [number, number, number]
  fov: number
}

const at = (chapterId: string, t: number) => {
  const c = chapters.find((x) => x.id === chapterId)!
  return c.start + (c.end - c.start) * t
}

/**
 * Camera path in district-local coordinates (three.js Y-up, metres).
 *
 * The film carries chapters 1 to 16, so the only district with a camera is the
 * globe. The paths for the modelled districts are in git history with the
 * scenes they belonged to.
 */
export const camKeys: CamKey[] = [
  { p: 0.0, stage: 'globe', pos: [13.5, 4.4, 16.5], target: [0, 0, 0], fov: 40 },
  // 17 routes — a slow settle as the routes draw
  { p: at('c17-routes', 0.02), stage: 'globe', pos: [13.5, 4.4, 16.5], target: [0, 0, 0], fov: 40 },
  { p: at('c17-routes', 1), stage: 'globe', pos: [11.0, 2.6, 14.5], target: [0.4, 0.3, 0], fov: 40 },
  // 18 RFQ — globe held to one side, console takes the frame
  { p: at('c18-rfq', 0.02), stage: 'globe', pos: [11.0, 2.4, 15.0], target: [0.4, 0.3, 0], fov: 40 },
  { p: 1.0, stage: 'globe', pos: [10.0, 1.8, 17.0], target: [-1.4, 0.2, 0], fov: 42 },
]

camKeys.sort((a, b) => a.p - b.p)
