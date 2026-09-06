-- FC EDINET v1.1.2
-- Добавляем домашний стадион в профиль команды.
-- Запускать ПОСЛЕ 009_team_logos_fix.sql.

alter table public.teams
  add column if not exists home_stadium text;

-- Для нашего клуба задаём стадион по умолчанию, если поле ещё пустое.
update public.teams
set home_stadium = 'Stadionul Edineț'
where slug = 'fc-edinet'
  and (home_stadium is null or trim(home_stadium) = '');

-- Контрольная проверка.
select id, name, home_stadium
from public.teams
order by is_club desc, name;
