# Higgsfield — how the film was made

## Status: complete

Eighteen stills and eighteen five-second clips carry chapters 1 to 16. Sources:

- `public/assets/media/higgsfield/stills/*.jpg` — the stills at native generation
  size (2752 wide, or 3840 wide for the four 4k regenerations). Masters in
  `media-src/stills/`.
- `media-src/video/*.mp4` — the 1080p clip masters. They are not served.
- `public/assets/frames/` — the scrub strips cut from them by
  `scripts/make-frames.mjs`, indexed by `frames.json`.
- `public/assets/media/higgsfield/collector/image_jobs.json` — job ids.

## How it was produced

1. `generate_image` with `nano_banana_pro`, 16:9, `2k` (or `4k` for a hero
   scene), a prompt written from the chapter, the shared negative list appended.
2. QA the still by eye against the rules in the brief: nobody standing in the
   sea, no red meat on a cutting table, fish anatomy right, no muddy or blurry
   plate. Reject and reroll, do not fix in post.
3. `generate_video` with `seedance_2_0`, `duration: 5`, **`resolution: '1080p'`**
   (the default is 720p and it was the reason the film looked soft), silent, the
   still passed as `start_image`, a prompt that describes one slow camera move
   and nothing else.
4. Check a mid-clip frame the same way as the still.
5. Drop the mp4 into `media-src/video/<clip>.mp4` and run `make-frames` with
   the chapter weights.

## Notes from the run

- Use `generate_image_batch` / `generate_video_batch` with `jobs_wait`.
- The video endpoint sometimes answers with a preset recommendation instead of
  a job. Resubmit with `declined_preset_id` set to the id it returned.
- More than about ten video jobs at once returns HTTP 429. Submit in waves.
- 5 s at 1080p is 45 credits; 4k is 110. A 2k still is 4, a 4k still is 4.
