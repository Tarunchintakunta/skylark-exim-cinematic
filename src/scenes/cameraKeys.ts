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
 * Two keys per chapter: the shot opens and the shot lands.
 */
export const camKeys: CamKey[] = [
  // 01 opening port — low on the wet dock, dolly toward the vessel
  { p: 0.0, stage: 'ocean', pos: [-54, 3.4, 30], target: [-4, 8.5, -6], fov: 44 },
  { p: at('ch01-opening-port', 1), stage: 'ocean', pos: [-32, 5.4, 22], target: [-1, 7.0, -4], fov: 42 },
  // 02 boarding — dock to deck in one push
  { p: at('ch02-boarding', 0.02), stage: 'ocean', pos: [-28, 5.6, 19], target: [-2, 6.6, -3], fov: 42 },
  { p: at('ch02-boarding', 1), stage: 'ocean', pos: [-7, 7.4, 9.5], target: [1, 4.4, 0.5], fov: 44 },
  // 03 compass — rise above the vessel, still tracking forward
  { p: at('ch03-compass', 0.02), stage: 'ocean', pos: [-7, 8.2, 10], target: [2, 4.4, 0], fov: 44 },
  { p: at('ch03-compass', 1), stage: 'ocean', pos: [-16, 22, 20], target: [4, 3.0, 0], fov: 40 },
  // 04 into the bay — climb to a near-vertical aerial of the vessel underway,
  // hold it, then drop back to sea level. This is the film's hero top view.
  { p: at('ch04-into-the-bay', 0.02), stage: 'ocean', pos: [-18, 26, 22], target: [4, 2, 0], fov: 40 },
  { p: at('ch04-into-the-bay', 0.30), stage: 'ocean', pos: [10, 78, 30], target: [-4, 0.6, -6], fov: 36 },
  { p: at('ch04-into-the-bay', 0.55), stage: 'ocean', pos: [7, 62, 19], target: [-2, 0.6, -4], fov: 36 },
  { p: at('ch04-into-the-bay', 0.80), stage: 'ocean', pos: [-30, 22, 30], target: [0, 3.5, -6], fov: 38 },
  { p: at('ch04-into-the-bay', 1), stage: 'ocean', pos: [-34, 3.2, 24], target: [-2, 5.5, -8], fov: 40 },
  // 05 nets — follow the net line from deck into the sea
  { p: at('ch05-nets', 0.02), stage: 'ocean', pos: [-9.0, 9.2, 16.0], target: [2.4, 3.6, 0.8], fov: 44 },
  { p: at('ch05-nets', 1), stage: 'ocean', pos: [11.5, 7.2, 12.0], target: [2.6, 3.4, 1.8], fov: 46 },
  // 06 catch — close on the fish, then wide on deck
  { p: at('ch06-swordfish-and-tuna', 0.02), stage: 'ocean', pos: [9.6, 6.6, 10.6], target: [2.6, 3.7, 2.2], fov: 44 },
  { p: at('ch06-swordfish-and-tuna', 0.24), stage: 'ocean', pos: [7.4, 5.8, 7.4], target: [0.6, 3.1, 0.6], fov: 46 },
  { p: at('ch06-swordfish-and-tuna', 0.42), stage: 'ocean', pos: [-2.05, 4.95, 3.15], target: [-4.85, 2.95, -1.15], fov: 40 },
  { p: at('ch06-swordfish-and-tuna', 1), stage: 'ocean', pos: [-15, 9.4, 16], target: [0.0, 3.4, -0.4], fov: 44 },
  // 07 chilled hold — interior
  { p: at('ch07-onboard-cold-storage', 0.02), stage: 'hold', pos: [-2.35, 2.15, 1.95], target: [1.4, 1.05, -0.5], fov: 58 },
  { p: at('ch07-onboard-cold-storage', 1), stage: 'hold', pos: [-0.9, 1.55, 1.25], target: [1.9, 1.05, -0.7], fov: 46 },
  // 08 return to port — sky to dock
  { p: at('ch08-return-to-port', 0.02), stage: 'ocean', pos: [-74, 46, 52], target: [-6, 3, -30], fov: 40 },
  { p: at('ch08-return-to-port', 1), stage: 'ocean', pos: [-38, 7.6, 26], target: [-4, 5.5, -14], fov: 42 },
  // 09 transfer — follow the hero container along the quay
  { p: at('ch09-cold-chain-transfer', 0.02), stage: 'quay', pos: [-22, 6.0, 16], target: [-8, 2, 6], fov: 46 },
  { p: at('ch09-cold-chain-transfer', 1), stage: 'quay', pos: [12, 4.4, 14], target: [10, 2.0, 6], fov: 44 },
  // 10 plant arrival
  { p: at('ch10-processing-arrival', 0.02), stage: 'plant', pos: [-11.4, 2.7, 6.6], target: [4.0, 1.5, -1.5], fov: 56 },
  { p: at('ch10-processing-arrival', 1), stage: 'plant', pos: [-6.6, 2.35, 5.6], target: [6.0, 1.3, -2.0], fov: 52 },
  // 11 cutting
  { p: at('ch11-cutting', 0.02), stage: 'plant', pos: [-8.4, 2.1, 1.2], target: [-2.5, 1.15, 4.4], fov: 48 },
  { p: at('ch11-cutting', 1), stage: 'plant', pos: [-3.2, 1.62, 2.0], target: [-2.6, 1.02, 4.4], fov: 38 },
  // 12 ponds — aerial to ground
  { p: at('ch12-pond-origin', 0.02), stage: 'ponds', pos: [-20, 88, 96], target: [0, 0, 0], fov: 42 },
  { p: at('ch12-pond-origin', 1), stage: 'ponds', pos: [-44.5, 3.0, 14.5], target: [-40.5, 1.2, 8.2], fov: 48 },
  // 13 product forms — catalogue sweep
  { p: at('ch13-product-forms', 0.02), stage: 'ponds', pos: [-25.0, 4.2, 11.5], target: [-30, 1.15, 4], fov: 44 },
  { p: at('ch13-product-forms', 1), stage: 'ponds', pos: [-28.6, 2.55, 7.6], target: [-30.2, 1.18, 4.0], fov: 42 },
  // 14 grading
  { p: at('ch14-grading', 0.02), stage: 'plant', pos: [-11.0, 2.6, -1.4], target: [0, 1.25, -5.4], fov: 52 },
  { p: at('ch14-grading', 1), stage: 'plant', pos: [-2.0, 2.15, -1.6], target: [3.0, 1.05, -6.2], fov: 44 },
  // 15 QC
  { p: at('ch15-qc-and-residue-testing', 0.02), stage: 'qc', pos: [-3.4, 2.0, 2.9], target: [1.0, 1.15, -2.0], fov: 52 },
  { p: at('ch15-qc-and-residue-testing', 0.55), stage: 'qc', pos: [-0.2, 1.95, 2.15], target: [-2.0, 1.25, -2.1], fov: 50 },
  { p: at('ch15-qc-and-residue-testing', 1), stage: 'qc', pos: [1.1, 2.0, 2.3], target: [2.5, 1.15, -1.9], fov: 50 },
  // 16 freezing and glazing
  { p: at('ch16-freezing-and-glazing', 0.02), stage: 'freeze', pos: [-9.4, 2.6, 5.1], target: [4.0, 1.6, 1.5], fov: 54 },
  { p: at('ch16-freezing-and-glazing', 0.55), stage: 'freeze', pos: [-5.6, 3.05, 5.45], target: [2.2, 1.80, 2.5], fov: 50 },
  { p: at('ch16-freezing-and-glazing', 1), stage: 'freeze', pos: [6.2, 2.35, 5.1], target: [9.4, 1.55, 2.2], fov: 44 },
  // 17 cold storage — the aisle
  { p: at('ch17-packing-and-cold-storage', 0.02), stage: 'coldstore', pos: [-17.0, 2.6, 0], target: [16, 3.0, 0], fov: 58 },
  { p: at('ch17-packing-and-cold-storage', 1), stage: 'coldstore', pos: [2.0, 3.0, 0], target: [22, 3.2, 0], fov: 54 },
  // 18 documents
  { p: at('ch18-export-documents', 0.02), stage: 'docs', pos: [-2.6, 2.2, 2.6], target: [0, 0.5, 0], fov: 44 },
  { p: at('ch18-export-documents', 1), stage: 'docs', pos: [0, 1.7, 2.3], target: [0, 0.6, 0], fov: 38 },
  // 19 reefer
  { p: at('ch19-reefer-containers', 0.02), stage: 'reefer', pos: [16, 4.2, 12], target: [0, 1.4, 0], fov: 46 },
  { p: at('ch19-reefer-containers', 1), stage: 'reefer', pos: [11.5, 1.9, 4.2], target: [3, 1.4, 0], fov: 40 },
  // 20 container vessel — top-down grid then departure
  { p: at('ch20-container-vessel', 0.02), stage: 'fleet', pos: [0, 210, 40], target: [0, 14, 0], fov: 38 },
  { p: at('ch20-container-vessel', 0.6), stage: 'fleet', pos: [-110, 90, 150], target: [10, 16, 0], fov: 38 },
  { p: at('ch20-container-vessel', 1), stage: 'fleet', pos: [-230, 46, 250], target: [0, 16, 0], fov: 36 },
  // 21 globe
  { p: at('ch21-globe-and-routes', 0.02), stage: 'globe', pos: [13.5, 4.4, 16.5], target: [0, 0, 0], fov: 40 },
  { p: at('ch21-globe-and-routes', 1), stage: 'globe', pos: [11.0, 2.6, 14.5], target: [0.4, 0.3, 0], fov: 40 },
  // 22 RFQ — globe held to one side, console takes the frame
  { p: at('ch22-rfq', 0.02), stage: 'globe', pos: [11.0, 2.4, 15.0], target: [0.4, 0.3, 0], fov: 40 },
  { p: 1.0, stage: 'globe', pos: [10.0, 1.8, 17.0], target: [-1.4, 0.2, 0], fov: 42 },
]

camKeys.sort((a, b) => a.p - b.p)
