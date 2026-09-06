/**
 * Skylark Exim — production asset manifest.
 * Generated and maintained by the automated Blender/Higgsfield pipeline.
 */
export type AssetStatus =
  | 'planned'
  | 'generated'
  | 'verified'
  | 'integrated'
  | 'needs-regeneration'
  | 'blocked'

export type AssetType = 'model' | 'render' | 'video' | 'image'
export type SourceTool = 'blender-mcp' | 'higgsfield' | 'procedural-webgl'

export interface AssetEntry {
  id: string
  name: string
  type: AssetType
  sourceTool: SourceTool
  filePath: string
  scene: string
  status: AssetStatus
  animationNotes: string
  scaleNotes: string
  optimizationNotes: string
  fallbackPath: string
}

const M = '/assets/models'
const R = '/assets/renders/blender-previews'
const F = '/assets/media/fallbacks'

export const assetManifest: AssetEntry[] = [
  {
    id: 'large_fishing_vessel',
    name: 'Large Indian Fishing Vessel',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/vessels/large_fishing_vessel.glb`,
    scene: 'ch01-opening-port, ch02-boarding, ch04-into-the-bay, ch05-nets, ch08-return-to-port',
    status: 'integrated',
    animationNotes:
      'HatchLidPivot keyframed open/close 1-120. Pivot_Roll drives scroll-linked heel. Pivot_Wake anchors foam. WinchP/WinchS rotate for net haul.',
    scaleNotes: '34.0 m LOA, 8.6 m beam, metres, +X = bow, origin at waterline midships.',
    optimizationNotes: '19.8k tris, 467 KB GLB, flat-shaded hull with smooth loft normals, no textures.',
    fallbackPath: `${F}/ch01-opening-port.jpg`,
  },
  {
    id: 'container_vessel_export',
    name: 'Export Container Vessel',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/vessels/container_vessel_export.glb`,
    scene: 'ch01-opening-port (background), ch20-container-vessel',
    status: 'integrated',
    animationNotes: '14 CV_Bay* groups are separate empties for staggered scroll-linked container settle.',
    scaleNotes: '240 m LOA, 34 m beam, metres, +X = bow.',
    optimizationNotes: '18.4k tris, 487 KB GLB, container bays built as instanced boxes.',
    fallbackPath: `${F}/ch20-container-vessel.jpg`,
  },
  {
    id: 'fishing_crew_set',
    name: 'Fishing Crew Character Set',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/vessels/fishing_crew_set.glb`,
    scene: 'ch02-boarding, ch05-nets, ch09-cold-chain-transfer',
    status: 'integrated',
    animationNotes:
      'Six poses: boarding, rope, net-cast, carry, stand, inspect. Every joint is a named empty (Hips/LArm/LElbow/LLeg/LKnee) for procedural sway.',
    scaleNotes: '1.72 m standing height, Z up, feet at z=0.',
    optimizationNotes: '8.4k tris, 252 KB GLB, shared limb meshes.',
    fallbackPath: `${R}/fishing_crew_set.jpg`,
  },
  {
    id: 'fishing_nets_and_ropes',
    name: 'Fishing Nets And Ropes',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/ocean/fishing_nets_and_ropes.glb`,
    scene: 'ch05-nets',
    status: 'integrated',
    animationNotes:
      'Net_Cast scales 0.15 to 1.0 across frames 1-55 for the cast. Net_Trawl reads from underwater cameras. Float line and rope coils are static dress.',
    scaleNotes: '7 m cast diameter, 8 m trawl cone length, metres.',
    optimizationNotes: '21.9k tris, 513 KB GLB, curve-based net converted to mesh at low bevel resolution.',
    fallbackPath: `${F}/ch05-nets.jpg`,
  },
  {
    id: 'swordfish_hero',
    name: 'Swordfish (Hero)',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/products/swordfish_hero.glb`,
    scene: 'ch06-swordfish-and-tuna, ch07-onboard-cold-storage, ch11-cutting',
    status: 'integrated',
    animationNotes:
      'Two named nodes. Swordfish_Display yaws gently for the product turntable; ' +
      'Swordfish_OnDeck is rolled onto its flank for the deck-and-ice pose. The site ' +
      'selects one node with ModelPart so both never appear at once.',
    scaleNotes: '3.24 m overall, bill about a third of that and lofted into the head, metres, +X = head.',
    optimizationNotes:
      '3.9k tris, 165 KB GLB. Countershading ships as a COLOR_0 vertex attribute ' +
      '(dark metallic blue back, silver-white belly, lateral line) so there are no textures.',
    fallbackPath: `${F}/ch06-catch.jpg`,
  },
  {
    id: 'tuna_hero',
    name: 'Tuna (Hero)',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/products/tuna_hero.glb`,
    scene: 'ch06-swordfish-and-tuna, ch07-onboard-cold-storage, ch11-cutting',
    status: 'integrated',
    animationNotes:
      'Two named nodes, Tuna_Display and Tuna_OnDeck, selected with ModelPart. ' +
      'Sixteen small yellow finlets are separate meshes.',
    scaleNotes: '2.25 m fork length, conical head, no bill, metres, +X = head.',
    optimizationNotes:
      '4.1k tris, 201 KB GLB. COLOR_0 vertex countershading with a yellow lateral band; no textures.',
    fallbackPath: `${F}/ch06-catch.jpg`,
  },
  {
    id: 'supporting_ocean_fish',
    name: 'Supporting Ocean Fish Set',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/products/supporting_ocean_fish.glb`,
    scene: 'ch06-swordfish-and-tuna, ch14-grading',
    status: 'integrated',
    animationNotes:
      'Six species along +Y for a catalogue sweep. Static and deliberately simpler than ' +
      'the hero fish so swordfish and tuna stay the heroes.',
    scaleNotes:
      'Every dimension is a fraction of fork length, so a 0.24 m sardine is not a shrunken grouper. ' +
      'Mackerel 0.42 m to Barracuda 1.10 m, metres.',
    optimizationNotes: '7.9k tris, 253 KB GLB, per-species COLOR_0 countershading.',
    fallbackPath: `${R}/supporting_ocean_fish.jpg`,
  },
  {
    id: 'shrimp_product_forms',
    name: 'Shrimp Product Forms (HOSO / HLSO / PUD / PTO)',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/products/shrimp_product_forms.glb`,
    scene: 'ch13-product-forms, ch16-freezing-and-glazing',
    status: 'integrated',
    animationNotes: 'Form_HOSO / Form_HLSO / Form_PUD / Form_PTO are separate groups for cross-fade between forms.',
    scaleNotes: 'Consistent 21/25 count scale across all four forms, metres.',
    optimizationNotes: '15.3k tris, 575 KB GLB, shared segment geometry per form.',
    fallbackPath: `${F}/ch13-product-forms.jpg`,
  },
  {
    id: 'onboard_chilled_storage',
    name: 'Onboard Chilled Fish Storage',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/ocean/onboard_chilled_storage.glb`,
    scene: 'ch07-onboard-cold-storage',
    status: 'integrated',
    animationNotes: 'Hold_HatchPivot opens frames 1-45. Temperature panel reads -1.0 C and LOT BOB-1142.',
    scaleNotes: '6.0 x 5.0 x 3.0 m hold, metres, floor at z=0.',
    optimizationNotes: '12.1k tris, 474 KB GLB, includes the rebuilt tuna and swordfish stowed in ice.',
    fallbackPath: `${F}/ch07-chilled-hold.jpg`,
  },
  {
    id: 'port_transfer_system',
    name: 'Port Cold-Chain Transfer System',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/export/port_transfer_system.glb`,
    scene: 'ch09-cold-chain-transfer',
    status: 'integrated',
    animationNotes:
      'TransferHero translates -12 m to +16 m along the quay across frames 1-120. FL_ForksPivot lifts frames 1-40.',
    scaleNotes: '40 m quay section, metres, quay deck at z=0.',
    optimizationNotes: '7.8k tris, 262 KB GLB.',
    fallbackPath: `${F}/ch09-transfer.jpg`,
  },
  {
    id: 'processing_facility',
    name: 'Seafood Processing Facility',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/processing/processing_facility.glb`,
    scene: 'ch10-processing-arrival, ch11-cutting, ch14-grading',
    status: 'integrated',
    animationNotes:
      'PlantDoorPivot rolls up frames 1-50. Grading conveyor chutes carry 10/20 to 41/50 grade labels as separate meshes.',
    scaleNotes: '26 x 16 x 5.2 m hall, metres, floor at z=0.',
    optimizationNotes: '18.0k tris, 625 KB GLB, non-graphic portions only.',
    fallbackPath: `${F}/ch10-processing.jpg`,
  },
  {
    id: 'andhra_pond_grid',
    name: 'Andhra Aquaculture Pond Grid',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/ponds/andhra_pond_grid.glb`,
    scene: 'ch12-pond-origin',
    status: 'integrated',
    animationNotes: 'Twelve Aerator groups spin two full turns across frames 1-120. Batch tags and log book are static props.',
    scaleNotes: '200 x 160 m pond block, 34 x 22 m ponds, metres.',
    optimizationNotes: '8.3k tris, 467 KB GLB.',
    fallbackPath: `${F}/ch12-ponds.jpg`,
  },
  {
    id: 'qc_lab_station',
    name: 'QC And Residue Testing Lab',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/qc/qc_lab_station.glb`,
    scene: 'ch15-qc-and-residue-testing',
    status: 'integrated',
    animationNotes: 'ClearanceStampPivot presses down frames 1-55. Analyser screen reads PASS. Vial rack holds eight samples.',
    scaleNotes: '11 x 8 x 3.4 m lab, metres, floor at z=0.',
    optimizationNotes: '5.2k tris, 254 KB GLB.',
    fallbackPath: `${F}/ch15-qc.jpg`,
  },
  {
    id: 'freezing_glazing_system',
    name: 'IQF Freezing And Glazing System',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/cold-chain/freezing_glazing_system.glb`,
    scene: 'ch16-freezing-and-glazing',
    status: 'integrated',
    animationNotes:
      'IQFProduct belt translates across frames 1-120. Ten Anchor_Frost and six Anchor_Glaze empties position particle emitters. Blast cabinet doors read -40 C, -35 C, -18 C.',
    scaleNotes: '22 x 12 x 5 m room, 16 m IQF tunnel, metres.',
    optimizationNotes: '13.0k tris, 580 KB GLB.',
    fallbackPath: `${F}/ch16-freezing.jpg`,
  },
  {
    id: 'cold_storage_700_pallets',
    name: 'Cold Storage — 700 Pallet Capacity',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/cold-chain/cold_storage_700_pallets.glb`,
    scene: 'ch17-packing-and-cold-storage',
    status: 'integrated',
    animationNotes: 'CS_Door1Pivot / CS_Door-1Pivot swing open frames 1-40. Display reads -20 C and 700 PALLETS.',
    scaleNotes: '40 x 26 x 9 m chamber, six racking rows, four levels, metres.',
    optimizationNotes: '22.3k tris, 1.66 MB GLB, pallets share one mesh datablock per level.',
    fallbackPath: `${F}/ch17-cold-storage.jpg`,
  },
  {
    id: 'export_documents',
    name: 'Export Document Cards',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/export/export_documents.glb`,
    scene: 'ch18-export-documents',
    status: 'integrated',
    animationNotes:
      'Seven Doc_* cards fan into a stack on staggered keys frames 40-82. Titles are extruded text so they stay legible without textures.',
    scaleNotes: '2.1 x 1.5 m cards on a 3.4 m desk, metres.',
    optimizationNotes: '29.5k tris, 1.25 MB GLB, text geometry dominates the budget.',
    fallbackPath: `${F}/ch18-documents.jpg`,
  },
  {
    id: 'reefer_container',
    name: 'Reefer Export Container',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/containers/reefer_container.glb`,
    scene: 'ch19-reefer-containers, ch22-rfq',
    status: 'integrated',
    animationNotes:
      'Reefer_DoorLPivot / Reefer_DoorRPivot close frames 1-60, Reefer_SealBarPivot drops frames 70-100. Reefer unit display reads -20 C.',
    scaleNotes: '40 ft ISO reefer, 12.03 x 2.44 x 2.59 m, metres.',
    optimizationNotes: '4.4k tris, 254 KB GLB, loaded with sixteen carton pallets.',
    fallbackPath: `${F}/ch19-reefer.jpg`,
  },
  {
    id: 'globe_routes_from_india',
    name: 'Globe And Global Export Routes',
    type: 'model',
    sourceTool: 'blender-mcp',
    filePath: `${M}/export/globe_routes_from_india.glb`,
    scene: 'ch21-globe-and-routes, ch22-rfq',
    status: 'integrated',
    animationNotes:
      'Fourteen Route_* arcs from Visakhapatnam. Each has a MarketAnchor_* empty for the DOM market label. Pivot_Globe_Spin drives rotation.',
    scaleNotes: '5.0 m radius globe, routes lifted to 1.3 R at apex.',
    optimizationNotes: '55.9k tris, 1.22 MB GLB, graticule drawn as thin swept curves.',
    fallbackPath: `${F}/ch21-globe.jpg`,
  },
  {
    id: 'ocean_surface',
    name: 'Bay of Bengal Ocean Surface',
    type: 'model',
    sourceTool: 'procedural-webgl',
    filePath: 'src/shaders/ocean.ts',
    scene: 'ch01 to ch09, ch20, ch21',
    status: 'integrated',
    animationNotes:
      'Four-band Gerstner sum with scroll-driven swell amplitude, sun glint and depth-graded blue-green colour ramp.',
    scaleNotes: '2000 x 2000 m plane, 256 segment grid, metres.',
    optimizationNotes: 'Vertex-displaced shader, no textures, one draw call.',
    fallbackPath: `${F}/ch01-opening-port.jpg`,
  },
  {
    id: 'blender_chapter_plates',
    name: 'Cinematic Chapter Plates (Blender collector)',
    type: 'render',
    sourceTool: 'blender-mcp',
    filePath: `${F}/`,
    scene: 'ch01, ch02, ch05, ch06, ch07, ch09, ch10, ch12, ch13, ch15, ch16, ch17, ch18, ch19, ch20, ch21',
    status: 'integrated',
    animationNotes:
      'Sixteen 1600x900 stills rendered from the exact camera each website chapter uses, so a Higgsfield image-to-video job started from a plate lands in the same framing.',
    scaleNotes: '16:9, metres, cameras mirrored from src/scenes/cameraKeys.ts.',
    optimizationNotes: 'JPEG quality 4, 780 KB for the full set.',
    fallbackPath: `${R}/`,
  },
  {
    id: 'blender_hero_turntables',
    name: 'Hero Asset Turntables (Blender collector)',
    type: 'render',
    sourceTool: 'blender-mcp',
    filePath: '/assets/media/higgsfield/collector/turntables/',
    scene: 'reference material for the Higgsfield collector workflow',
    status: 'verified',
    animationNotes: 'Four azimuths (30, 120, 210, 300 degrees) for each of six hero assets.',
    scaleNotes: '960x540, elevation 18 degrees, framing fill 1.12.',
    optimizationNotes: 'JPEG quality 5, 428 KB for 24 frames.',
    fallbackPath: `${R}/`,
  },
  {
    id: 'higgsfield_cinematic_plates',
    name: 'Higgsfield Cinematic Scene Plates',
    type: 'video',
    sourceTool: 'higgsfield',
    filePath: '/assets/media/higgsfield/',
    scene: 'all chapters (atmospheric plates)',
    status: 'blocked',
    animationNotes:
      'BLOCKED. The Blender collector package is complete and waiting at ' +
      'public/assets/media/higgsfield/collector/collector_manifest.json: sixteen chapter plates, ' +
      'twenty-four turntable frames, per-chapter prompts, a shared negative prompt and the exact ' +
      'camera for every shot. The Higgsfield MCP connection resolves to one private workspace on ' +
      'the free plan with zero credits, so every generation returns "Out of credits in the ' +
      'selected workspace". See scripts/higgsfield-submit.md for the run steps.',
    scaleNotes: '16:9 plates, 1080p, matched to each chapter camera.',
    optimizationNotes: 'Would ship as H.264 + WebM loops under 2 MB each.',
    fallbackPath: `${F}/`,
  },
]

export const assetsByScene = (sceneId: string) =>
  assetManifest.filter((a) => a.scene.includes(sceneId))

export const manifestSummary = () => {
  const by: Record<string, number> = {}
  assetManifest.forEach((a) => {
    by[a.status] = (by[a.status] ?? 0) + 1
  })
  return by
}
