# FC Edineț v2.30.5 FULL — Album Experience Fix

## Problem fixed
The earlier gallery used a narrow right-hand information panel and older
CSS overrides modified its column geometry, shifting the full photo to one
side. In v2.30.5 the viewer has **its own scoped classes and layout**:
centered full-resolution photo (`object-fit: contain`), contextual navigation,
a compact footer and a responsive thumbnail filmstrip. Keyboard focus trap,
focus return, body scroll lock and swipe remain supported.

## Per-album cover positioning
The album editing page includes a live wide-hero preview. Drag the photograph
to choose the crop (works with mouse/touch) or move the X/Y sliders; Reset
returns both to center. Saves positions on `media_albums` and applies them to
that album only when the hero template uses content images. Server validates
0–100 range and migration defaults to 50/50. Existing photos are untouched.

## Deployment
Run `database/076_media_album_cover_focus.sql` **before** deploying code.
Run `DEPLOY_FC_EDINET.bat` and require a successful build, then check Vercel.
See `STEP-2.30.5.txt`.
