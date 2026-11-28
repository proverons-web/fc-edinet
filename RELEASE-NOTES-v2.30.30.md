# FC Edineț v2.30.30 — Photo framing

- Shared photo editor now uses the actual output frame as its reference. Original aspect and 100% shows the whole image. Fit preserves the entire image; Fill covers the frame; zoom is adjustable from 10% to 300% (lower if necessary for extreme aspect ratios).
- Drag, arrow controls and reset use the same bounded geometry as the exported WebP, including intentional white padding.
- News covers have six live preview formats and desktop/mobile switching. Published news image areas and preview image areas use the same responsive aspect-ratio CSS contract. Fixed heights are replaced with these consistent proportional frames.
- A newly approved cover resets the news focus to 50/50 and 100%; existing cover settings are not changed unless a new image is selected.
- No new database migration; prior v2.30.29 fixes are retained.
