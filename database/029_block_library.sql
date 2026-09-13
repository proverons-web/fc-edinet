-- FC EDINEȚ v2.1.7 — Block Library

alter table public.homepage_design_draft
  add column if not exists custom_blocks jsonb not null default '[]'::jsonb,
  add column if not exists layout_order jsonb not null default '[]'::jsonb;

create table if not exists public.homepage_blocks (
  id uuid primary key default gen_random_uuid(),
  block_type text not null check (block_type in (
    'text','image','text_image','cta','news','players','media','partners','next_match','standings'
  )),
  content jsonb not null default '{}'::jsonb,
  design_config jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  display_order integer not null default 100,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists homepage_blocks_display_order_idx
  on public.homepage_blocks(display_order, created_at);
create index if not exists homepage_blocks_created_by_idx
  on public.homepage_blocks(created_by);
create index if not exists homepage_blocks_updated_by_idx
  on public.homepage_blocks(updated_by);

alter table public.homepage_blocks enable row level security;

drop policy if exists "Public can read enabled homepage blocks" on public.homepage_blocks;
create policy "Public can read enabled homepage blocks"
on public.homepage_blocks for select to anon
using (is_enabled = true);

drop policy if exists "Authenticated can read homepage blocks" on public.homepage_blocks;
create policy "Authenticated can read homepage blocks"
on public.homepage_blocks for select to authenticated
using (is_enabled = true or public.is_editor_or_admin());

drop policy if exists "Editors insert homepage blocks" on public.homepage_blocks;
create policy "Editors insert homepage blocks"
on public.homepage_blocks for insert to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "Editors update homepage blocks" on public.homepage_blocks;
create policy "Editors update homepage blocks"
on public.homepage_blocks for update to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "Editors delete homepage blocks" on public.homepage_blocks;
create policy "Editors delete homepage blocks"
on public.homepage_blocks for delete to authenticated
using (public.is_editor_or_admin());

grant select on public.homepage_blocks to anon, authenticated;
grant insert, update, delete on public.homepage_blocks to authenticated;

-- Reuse the common timestamp trigger from the project.
drop trigger if exists set_homepage_blocks_updated_at on public.homepage_blocks;
create trigger set_homepage_blocks_updated_at
before update on public.homepage_blocks
for each row execute function public.set_updated_at();

-- Audit published block changes like the rest of the CMS.
drop trigger if exists audit_log_homepage_blocks on public.homepage_blocks;
create trigger audit_log_homepage_blocks
after insert or update or delete on public.homepage_blocks
for each row execute function public.write_audit_log();
