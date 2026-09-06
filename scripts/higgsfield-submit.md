# Higgsfield — Blender collector workflow

## Status: complete

Seventeen photoreal stills and thirteen five-second loops were generated and are
integrated. Sources:

- `public/assets/media/higgsfield/collector/collector_manifest.json` — one entry
  per chapter with the prompt, the shared negative prompt, and the exact Blender
  camera.
- `public/assets/media/fallbacks/*.jpg` — Blender collector plates, the seed
  frames.
- `public/assets/media/higgsfield/stills/*.jpg` — the generated photoreal frames.
- `public/assets/media/higgsfield/video/*.mp4` — the generated loops, 1280 wide,
  H.264, faststart, silent.
- `public/assets/media/higgsfield/collector/image_jobs.json` — job ids, for
  traceability.

## How it was produced

1. Render the chapter plate in Blender from the same camera the website chapter
   uses (`blender/scripts/collector.py`).
2. `media_upload` the plate, PUT the bytes, `media_confirm`.
3. `generate_image` with `nano_banana_pro`, 16:9, 2k, the plate passed as
   `image_references`, and a prompt that says to keep the composition.
4. `generate_video` with `seedance_2_0`, five seconds, 1080p, silent, the
   generated frame passed as `start_image`.
5. Transcode to 1280 wide H.264 with `+faststart`, strip audio.
6. Add the chapter to `src/data/cinematicPlates.ts`.

## Regenerating one chapter

Use `generate_image_batch` and `generate_video_batch` with `jobs_wait`, not one
call per chapter. Two notes from the run:

- The video endpoint sometimes answers with a preset recommendation instead of a
  job. Resubmit that index with `declined_preset_id` set to the id it returned.
- Submitting more than about ten video jobs at once returns HTTP 429. Submit in
  waves.

Seeding every generation from the Blender plate is what keeps the cut on the
same framing as the 3D scene. Do not generate these from a text prompt alone.
