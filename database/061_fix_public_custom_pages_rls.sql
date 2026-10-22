-- FC Edineț v2.28.2 — public custom page RLS repair
-- Anonymous reads must never invoke editor-only helper functions.

drop policy if exists "Public reads published custom pages" on public.site_custom_pages;
drop policy if exists "Anon reads published custom pages" on public.site_custom_pages;
drop policy if exists "Authenticated reads published custom pages" on public.site_custom_pages;
drop policy if exists "Editors read all custom pages" on public.site_custom_pages;

create policy "Anon reads published custom pages"
on public.site_custom_pages
for select
to anon
using (status = 'published');

create policy "Authenticated reads published custom pages"
on public.site_custom_pages
for select
to authenticated
using (status = 'published');

create policy "Editors read all custom pages"
on public.site_custom_pages
for select
to authenticated
using (is_editor_or_admin());

notify pgrst, 'reload schema';
