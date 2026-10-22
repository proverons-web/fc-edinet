-- FC EDINET v2.22.0
-- Split Club into dedicated public pages and convert CLUB into a managed dropdown.

do $$
declare
  club_id bigint;
begin
  select id into club_id from public.site_menu_items where system_key = 'club' limit 1;

  if club_id is not null then
    update public.site_menu_items
      set href = '/club/about', label_ru = 'Клуб', label_ro = 'Club', updated_at = now()
      where id = club_id;

    insert into public.site_menu_items(system_key,label_ru,label_ro,href,visible,display_order,parent_id)
    values
      ('club_about','О клубе','Despre club','/club/about',true,10,club_id),
      ('club_history','История FC Edineț','Istoria FC Edineț','/club/history',true,20,club_id),
      ('club_stadium','Стадион','Stadion','/club/stadium',true,30,club_id),
      ('club_leadership','Руководство','Conducere','/club/leadership',true,40,club_id),
      ('club_achievements','Достижения','Performanțe','/club/achievements',true,50,club_id),
      ('club_archive','Архивные фото','Fotografii de arhivă','/club/archive',true,60,club_id),
      ('club_hall_of_fame','Зал славы','Galeria de onoare','/club/hall-of-fame',true,70,club_id)
    on conflict (system_key) do update set
      label_ru=excluded.label_ru,
      label_ro=excluded.label_ro,
      href=excluded.href,
      visible=true,
      display_order=excluded.display_order,
      parent_id=club_id,
      updated_at=now();
  end if;
end $$;

notify pgrst, 'reload schema';
