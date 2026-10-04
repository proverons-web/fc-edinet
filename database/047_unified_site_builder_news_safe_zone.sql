-- FC Edinet v2.4.0 — news cover safe-zone metadata
alter table public.news add column if not exists cover_position_x smallint not null default 50;
alter table public.news add column if not exists cover_position_y smallint not null default 50;
alter table public.news add column if not exists cover_zoom smallint not null default 100;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='news_cover_position_x_check') then
    alter table public.news add constraint news_cover_position_x_check check (cover_position_x between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname='news_cover_position_y_check') then
    alter table public.news add constraint news_cover_position_y_check check (cover_position_y between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname='news_cover_zoom_check') then
    alter table public.news add constraint news_cover_zoom_check check (cover_zoom between 100 and 200);
  end if;
end $$;

notify pgrst, 'reload schema';
