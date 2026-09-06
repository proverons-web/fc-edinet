-- FC EDINET v0.8
-- Редакционная система новостей.
-- Запускать ПОСЛЕ 004_auth_profiles.sql.

-- 1. Добавляем служебные поля редакции.
alter table public.news
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists submitted_at timestamptz,
  add column if not exists published_by uuid references public.profiles(id) on delete set null,
  add column if not exists editor_note text;

create index if not exists news_created_by_idx
  on public.news (created_by, status, updated_at desc);

-- 2. Даём authenticated технические права.
-- Реальное разрешение строк по-прежнему контролирует RLS.
grant insert, update, delete on table public.news to authenticated;
grant usage, select on sequence public.news_id_seq to authenticated;

-- 3. В v0.7 авторы видели все draft/review.
-- Теперь делаем модель точнее:
-- author: published + только собственные материалы;
-- editor/admin: все материалы.
drop policy if exists "Staff can read all news" on public.news;
drop policy if exists "Authors can read own editorial news" on public.news;
drop policy if exists "Editors can read all editorial news" on public.news;

create policy "Authors can read own editorial news"
on public.news
for select
to authenticated
using (
  public.current_user_role() = 'author'::public.user_role
  and created_by = (select auth.uid())
);

create policy "Editors can read all editorial news"
on public.news
for select
to authenticated
using (public.is_editor_or_admin());

-- Публичная policy "Public can read published news" из 003_news.sql остаётся.
-- Поэтому authenticated тоже видит опубликованные новости.

-- 4. INSERT.
drop policy if exists "Authors can create own news" on public.news;
create policy "Authors can create own news"
on public.news
for insert
to authenticated
with check (
  public.current_user_role() = 'author'::public.user_role
  and created_by = (select auth.uid())
  and status in ('draft', 'review')
  and published_at is null
  and published_by is null
);

drop policy if exists "Editors can create news" on public.news;
create policy "Editors can create news"
on public.news
for insert
to authenticated
with check (
  public.is_editor_or_admin()
  and created_by = (select auth.uid())
);

-- 5. UPDATE.
-- Автор может изменить только СВОЙ текущий draft.
-- Он может сохранить draft или перевести его в review.
-- После перехода в review USING перестаёт совпадать, поэтому автор
-- больше не сможет менять материал, пока редактор не вернёт его в draft.
drop policy if exists "Authors can update own drafts" on public.news;
create policy "Authors can update own drafts"
on public.news
for update
to authenticated
using (
  public.current_user_role() = 'author'::public.user_role
  and created_by = (select auth.uid())
  and status = 'draft'
)
with check (
  created_by = (select auth.uid())
  and status in ('draft', 'review')
  and published_at is null
  and published_by is null
);

drop policy if exists "Editors can update all news" on public.news;
create policy "Editors can update all news"
on public.news
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

-- 6. DELETE.
drop policy if exists "Authors can delete own drafts" on public.news;
create policy "Authors can delete own drafts"
on public.news
for delete
to authenticated
using (
  public.current_user_role() = 'author'::public.user_role
  and created_by = (select auth.uid())
  and status = 'draft'
);

drop policy if exists "Editors can delete all news" on public.news;
create policy "Editors can delete all news"
on public.news
for delete
to authenticated
using (public.is_editor_or_admin());

-- 7. Storage: обложки новостей.
-- Public bucket уже создан в 003_news.sql.
-- Public bucket открыт на чтение, но upload/delete всё равно требуют RLS.
drop policy if exists "Staff upload news covers" on storage.objects;
create policy "Staff upload news covers"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'news'
  and public.is_staff()
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

drop policy if exists "Staff delete own news covers" on storage.objects;
create policy "Staff delete own news covers"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'news'
  and public.is_staff()
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_editor_or_admin()
  )
);

-- 8. Для существующих демонстрационных материалов created_by может быть NULL.
-- Это нормально: editor/admin сможет ими управлять.
