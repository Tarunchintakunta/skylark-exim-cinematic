# Skylark Exim — Cinematic Scroll Website

A single-page WebGL voyage for an Indian seafood exporter. Scroll is the only
control: it moves the camera, cuts between stages, scrubs baked model animation,
drives the navigation HUD, dissolves between the 3D world and real footage, and
reveals every line of copy. There are no static sections.

> **Two Origins. One Standard.**

## Quick start

```bash
npm ci
npm run dev
```

Then open http://127.0.0.1:5173/

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on 5173 |
| `npm run build` | `tsc -b` then `vite build` into `dist/` |
| `npm run preview` | Serves the production build on 4173 |
| `npm run qa` | Playwright visual QA across four viewports |
| `npm run typecheck` | Types only, no emit |

## Deploying

The repository is Vercel-ready. Import it and accept the defaults, or:

```bash
npx vercel --prod
```

`vercel.json` pins the Vite framework preset, the `dist` output directory,
immutable caching for `/assets/**`, and baseline security headers. Any static
host works: build and serve `dist/`. There is no server, no database and no
environment variable to set.

## The story

Twenty-two chapters on one continuous timeline:

Opening port → boarding → compass and conditions → into the Bay of Bengal →
nets and the haul → swordfish and tuna → onboard chilled storage → return to
Vizag → cold-chain transfer → processing → cutting → Andhra ponds → product
forms → grading → QC and residue testing → freezing and glazing → packing and
cold storage → export documents → reefer loading → container vessel → globe and
routes → RFQ.

## Architecture

| Path | What it holds |
| --- | --- |
| `src/timeline/chapters.ts` | The 22 chapters, their scroll weights and normalised ranges |
| `src/timeline/useScrollTimeline.ts` | Lenis smoothing plus one master GSAP ScrollTrigger |
| `src/scenes/cameraKeys.ts` | The camera path, two to five keys per chapter |
| `src/scenes/CameraDirector.tsx` | Interpolates inside a stage, hard-cuts between stages |
| `src/scenes/OceanStage.tsx` | Ocean shader, sky, harbour, vessel, Kelvin wake, fishing action, catch station |
| `src/scenes/InteriorStages.tsx` | Hold, quay, plant, ponds, QC, freezing, cold store, docs, reefer, fleet, globe |
| `src/scenes/kit.tsx` | District offsets, GLB loading, scroll-scrubbed animation, node selection |
| `src/scenes/SceneEnvironment.tsx` | Generated studio environment so metals are not black |
| `src/shaders/ocean.ts` | Five-band Gerstner sum with sun glint, crest foam and coastal haze |
| `src/components/CinematicPlates.tsx` | The film cuts: photoreal footage dissolving over the 3D |
| `src/components/CompassHUD.tsx` | Maritime navigation HUD, every reading derived from scroll |
| `src/components/RFQ.tsx` | Buyer console, React Hook Form plus Zod |
| `src/data/assetManifest.ts` | Every asset with source tool, status and optimisation notes |
| `src/data/cinematicPlates.ts` | Which chapter cuts to which plate, and when |

Stages live in separate world districts and mount only near their own chapters,
so the GPU never carries the whole film at once.

## Stack

Vite, React 19, TypeScript, Three.js, React Three Fiber, Drei, GSAP
ScrollTrigger, Lenis, Zustand, React Hook Form, Zod, Lucide React. Assets from
Blender 5.2 via Blender MCP, and Higgsfield for the photoreal plates.

## Assets

Nineteen GLB models were generated, rendered, verified and exported through
Blender MCP against Blender 5.2. Build scripts are in `blender/scripts/`, saved
scenes in `blender/blends/`, QA renders in `public/assets/renders/`.

The hero fish carry their countershading as a `COLOR_0` vertex attribute rather
than a texture, so the dark metallic back, silver belly and lateral line survive
the GLB export with no image files. Swordfish and tuna each ship a display pose
and a handled-on-deck pose as separate named nodes; `ModelPart` selects one.

`blender/scripts/collector.py` produces the Higgsfield Blender collector
package: chapter plates rendered from the exact website cameras, hero turntable
frames, and `collector_manifest.json` carrying per-chapter prompts and camera
data.

## Cinematic plates

Seventeen photoreal stills and thirteen five-second loops were generated with
Higgsfield, each seeded from the Blender collector frame for that chapter, so a
cut lands on the same framing instead of jumping. `CinematicPlates` dissolves
them over the WebGL scene for one beat per chapter and dissolves away again.
Video decodes only while its plate is on screen, and reduced-motion visitors get
the still.

Run steps for regenerating them are in `scripts/higgsfield-submit.md`.

## Notable shots

Chapter 4 climbs to a near-vertical aerial of the vessel underway, held for a
beat before dropping back to sea level. Water deepens toward navy away from the
harbour so white foam reads from overhead, and the wake deforms on the same
Gerstner field as the ocean rather than being a flat quad the swell cuts
through.

Chapter 5 puts the crew on the gear: a hauling team bringing a full net bag over
the rail, a cast net in flight, mixed catch landing on deck, all scrubbed by
scroll. Chapter 6 lands swordfish and tuna into an insulated bin on crushed ice.

## Visual direction

The site's image is film, and the film is scrubbed frame by frame against the
scroll. A `<video>` cannot be driven by a wheel: seeking is asynchronous, lands
on the nearest keyframe and stalls the main thread, so scrolling gave loose
motion that kept going after you stopped. Every chapter's clip is therefore
stored as a strip of stills, and scroll position picks one and draws it to a
single 2D canvas — one frame per scroll position, exactly, and one composited
layer for the whole film.

`scripts/make-frames.mjs` builds the strips from `media-src/video`: AVIF at
1440x810 for the full-resolution strip, a small WebP of every frame that loads
first so scrubbing works immediately and stands in for browsers without AVIF,
and a desktop and mobile set each. `public/assets/frames/frames.json` indexes
them. `src/components/FilmStrip.tsx` draws them.

Decoded frames are uncompressed: a 1440x810 bitmap is 4.7 MB, so one strip
costs about 190 MB resident. The scrubber holds the current strip and one
either side and closes the rest, which is the difference between a smooth page
and a tab that stalls.

Chapters 1 to 8 are anchored to one hero vessel reference, so the same ship
leaves Visakhapatnam, works the Bay and comes home.

WebGL is now only the globe, and its canvas is not mounted at all until the
globe chapter is in reach — a full-viewport canvas left mounted is another large
layer for the compositor to carry down the whole page for nothing. The Blender
scenes for the other districts are intact under `src/scenes` and
`blender/scripts`, and still drive the collector plates that seed every
Higgsfield frame; `LIVE_STAGES` in `src/App.tsx` is the switch.

## Verification

`npm run qa` drives the real page at 1440x900, 1920x1080, 834x1194 and 390x844.
It lands a stop on every chapter, reads pixels back off the canvas to prove
nothing is blank, checks overlay bounding boxes for overlap and horizontal
overflow, asserts the business vocabulary is present, and exercises RFQ
validation. Screenshots land in `qa/shots/`, the machine-readable result in
`qa/report.json`. Run it against the production build with
`QA_URL=http://127.0.0.1:4173/ node scripts/qa.mjs` after `npm run preview`;
with no `QA_URL` it targets the dev server on port 5173.

`node scripts/perf.mjs` measures frame times while scrolling the whole story
(`DPR=2` to reproduce a retina display) and `node scripts/longtasks.mjs` reports
main-thread blocking. Both take `QA_URL`.

Four smaller helpers sit beside it and take a chapter id plus a scroll fraction,
for tracking down a bad frame without scrubbing by hand. `scripts/shot.mjs`
captures one frame. `scripts/probe.mjs` raycasts screen coordinates and names
what they hit. `scripts/parts.mjs` and `scripts/sub.mjs` print world bounding
boxes for a model's meshes. They need `?qa=1`, which is what exposes the live
scene on `window.__SKYLARK_R3F__`.

## Content accuracy

Three claims on this site are verifiable facts about the business and should be
confirmed before the site goes public: the 700-pallet cold store capacity,
current HACCP and EIC certification status, and that residue testing is
genuinely every batch against EU and US limits with the certificate travelling
with the carton. The source film package flags the same three.

The RFQ form has no backend. It validates, logs the payload and opens a mail
client to `exports@skylarkexim.com`. Point it at a real endpoint before launch.
