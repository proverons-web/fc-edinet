-- FC EDINET v2.3.2
-- Content Page Builder 1.0. First supported page: /club.
-- Run AFTER 041_match_statistics_foundation.sql.

create table if not exists public.content_page_layouts (
  page_key text primary key,
  draft_config jsonb not null default '{}'::jsonb,
  published_config jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.content_page_published (
  page_key text primary key,
  published_config jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now()
);

create index if not exists content_page_layouts_updated_at_idx
  on public.content_page_layouts (updated_at desc);

alter table public.content_page_layouts enable row level security;
alter table public.content_page_published enable row level security;

revoke all on table public.content_page_layouts from public, anon;
grant select, insert, update, delete on table public.content_page_layouts to authenticated;

grant select on table public.content_page_published to anon, authenticated;
grant insert, update, delete on table public.content_page_published to authenticated;

drop policy if exists "Editors manage content page layouts" on public.content_page_layouts;
create policy "Editors manage content page layouts"
on public.content_page_layouts
for all
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "Public reads published content page layouts" on public.content_page_published;
create policy "Public reads published content page layouts"
on public.content_page_published
for select
to anon, authenticated
using (true);

drop policy if exists "Editors publish content page layouts" on public.content_page_published;
create policy "Editors publish content page layouts"
on public.content_page_published
for all
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

do $$
declare
  v_default jsonb := '{"version":1,"sections":[{"key":"about","visible":true,"width":"container","background":"inherit","padding_top":88,"padding_bottom":88,"variant":"contact-right"},{"key":"stadium","visible":true,"width":"wide","background":"dark","padding_top":88,"padding_bottom":88,"variant":"cinematic","image_position_x":50,"image_position_y":52,"image_height":520},{"key":"history","visible":true,"width":"container","background":"surface","padding_top":88,"padding_bottom":88,"variant":"readable"},{"key":"leadership","visible":true,"width":"container","background":"inherit","padding_top":88,"padding_bottom":88,"variant":"cards","columns":3},{"key":"achievements","visible":true,"width":"container","background":"dark","padding_top":88,"padding_bottom":88,"variant":"timeline"}]}'::jsonb;
begin
  insert into public.content_page_layouts (page_key, draft_config, published_config, updated_at, published_at)
  values ('club', v_default, v_default, now(), now())
  on conflict (page_key) do nothing;

  insert into public.content_page_published (page_key, published_config, published_at)
  values ('club', v_default, now())
  on conflict (page_key) do nothing;
end $$;

notify pgrst, 'reload schema';
