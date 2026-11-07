# FC Edineț v2.30.11 — Mobile Experience & Image Delivery

Base: **v2.30.10 FULL FIX1**. No migrations, no alterations to match-center data, no admin design changes.

- **Keyboard-accessible mobile menu**: focus moves to the dialog when it opens; Tab and Shift+Tab cycle through available controls; Escape closes; focus is restored to the toggle if the dialog owned focus. The existing body-scroll lock is preserved.
- **Match logos optimized**: `/matches` uses `PublicImage` for the club's trusted public Supabase bucket, with bounded intrinsic dimensions and mobile `sizes`. The 20-item result list does not prefetch all protocol routes.
- **Standings logos optimized**: trusted public club logos use responsive Next.js image delivery.
- **Historic photo archive**: gallery thumbnails use lazy, responsive images; the opened full-size photo remains the unmodified original file.
- **Image layout stability**: explicit intrinsic dimensions for Header crest, home and detail Hero images, and YouTube video thumbnail. Fallback YouTube thumbnail no longer retries indefinitely when unavailable.
- **Reduced motion**: recent-matches carousel switches to immediate scrolling when the operating system requests less motion.
- **Testing**: new `qa:mobile` source-level regression checks are part of `deploy:check`, `qa:all`, and CI. CI installs dependencies and runs `npm run typecheck` before source and screenshot tests; the Windows installer also type-checks before `next build`.

**Scope**: low-risk image/network and accessibility changes. Do not interpret automated source checks or fixture screenshots as real-user Core Web Vitals measurements.
