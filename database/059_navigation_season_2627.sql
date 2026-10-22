-- FC Edineț v2.28.1 — compact season navigation
do $$
declare
  season_id bigint;
begin
  update public.site_menu_items
  set label_ru='Сезон 26/27', label_ro='Sezon 26/27', href='/team', visible=true, display_order=30, parent_id=null, updated_at=now()
  where system_key='team';

  select id into season_id from public.site_menu_items where system_key='team' limit 1;

  if season_id is not null then
    insert into public.site_menu_items(system_key,label_ru,label_ro,href,visible,display_order,parent_id)
    values ('team_squad','Состав','Lot','/team',true,10,season_id)
    on conflict (system_key) do update set label_ru=excluded.label_ru,label_ro=excluded.label_ro,href=excluded.href,visible=excluded.visible,display_order=excluded.display_order,parent_id=excluded.parent_id,updated_at=now();

    insert into public.site_menu_items(system_key,label_ru,label_ro,href,visible,display_order,parent_id)
    values ('team_staff','Тренерский штаб','Staff tehnic','/staff',true,20,season_id)
    on conflict (system_key) do update set label_ru=excluded.label_ru,label_ro=excluded.label_ro,href=excluded.href,visible=excluded.visible,display_order=excluded.display_order,parent_id=excluded.parent_id,updated_at=now();

    update public.site_menu_items set parent_id=season_id, visible=true, display_order=30, updated_at=now() where system_key='matches';
    update public.site_menu_items set parent_id=season_id, visible=true, display_order=40, updated_at=now() where system_key='statistics';
    update public.site_menu_items set parent_id=season_id, visible=true, display_order=50, updated_at=now() where system_key='standings';
  end if;

  update public.site_menu_items set display_order=10,parent_id=null,visible=true,updated_at=now() where system_key='home';
  update public.site_menu_items set display_order=20,parent_id=null,visible=true,updated_at=now() where system_key='news';
  update public.site_menu_items set display_order=40,parent_id=null,visible=true,updated_at=now() where system_key='club';
  update public.site_menu_items set display_order=50,parent_id=null,visible=true,updated_at=now() where system_key='media';
  update public.site_menu_items set parent_id=null,visible=false,display_order=90,updated_at=now() where system_key='academy';
  update public.site_menu_items set parent_id=null,visible=false,display_order=100,updated_at=now() where system_key='partners';
end $$;

notify pgrst, 'reload schema';
