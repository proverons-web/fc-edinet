-- FC Edineț v2.28.2 — public navigation RLS repair
-- Public menu reads must never invoke editor-only helper functions.

drop policy if exists "Public reads visible site menu" on public.site_menu_items;
drop policy if exists "Anon reads visible site menu" on public.site_menu_items;
drop policy if exists "Authenticated reads visible site menu" on public.site_menu_items;
drop policy if exists "Editors read all site menu" on public.site_menu_items;

create policy "Anon reads visible site menu"
on public.site_menu_items
for select
to anon
using (visible = true);

create policy "Authenticated reads visible site menu"
on public.site_menu_items
for select
to authenticated
using (visible = true);

create policy "Editors read all site menu"
on public.site_menu_items
for select
to authenticated
using (is_editor_or_admin());

notify pgrst, 'reload schema';
