# FC Edineț v2.29.17 — Hall of Fame QA

## Public /club/hall-of-fame
- [ ] RU and RO titles, labels, searches and descriptions; RO falls back to RU when missing.
- [ ] Portrait cards have equal heights; **long biographies never appear in the gallery**.
- [ ] Search by first name, last name, and combined name; reset and category tabs work together.
- [ ] Category filtering and server pagination (12 records per page) preserve filters.
- [ ] Cards open `/club/hall-of-fame/[id]`; back link returns to previous category and page.
- [ ] Detailed biographies preserve paragraphs and historical rosters preserve list entries.
- [ ] Mobile screens at 320, 360, 390, 768 px and desktop 1280+: no clipped text or horizontal page scrolling.
- [ ] No draft placeholders appear in public views; they remain manageable in admin.
- [ ] Existing coach profile text and photo unchanged in Supabase.

## Administration
- [ ] Add-person form is collapsed on entry; opens on demand.
- [ ] A new real person has `is_placeholder` off by default and is active by default.
- [ ] Filter by category, status and search; page through 20 items.
- [ ] Long descriptions are edited in the existing forms.
- [ ] Type `squad` always saves category `squad`.

## Deployment and QA
- [ ] `npm run qa:hall`, `npm run qa:all`, `npm run build`, `npm run qa:live` (13 core routes + 1 profile if published).
- [ ] `GET /api/version` is `2.29.17` after deployment.
- [ ] No database migration, no secret file included, all other pages unchanged.
