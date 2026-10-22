-- FC EDINET v2.28.0
-- Split TEAM into Squad + Staff dropdown and normalize the primary public navigation.

do $$
declare
  team_id bigint;
begin
  select id into team_id from public.site_menu_items where system_key = 'team' limit 1;

  if team_id is not null then
    update public.site_menu_items
      set label_ru = 'Команда', label_ro = 'Echipa', href = '/team/squad', visible = true, display_order = 30, parent_id = null, updated_at = now()
      where id = team_id;

    insert into public.site_menu_items(system_key,label_ru,label_ro,href,visible,display_order,parent_id)
    values
      ('team_squad','Состав','Lot','/team/squad',true,10,team_id),
      ('team_staff','Тренерский штаб','Staff tehnic','/team/staff',true,20,team_id)
    on conflict (system_key) do update set
      label_ru=excluded.label_ru,
      label_ro=excluded.label_ro,
      href=excluded.href,
      visible=true,
      display_order=excluded.display_order,
      parent_id=team_id,
      updated_at=now();
  end if;

  update public.site_menu_items set display_order=10, visible=true, parent_id=null, updated_at=now() where system_key='home';
  update public.site_menu_items set display_order=20, visible=true, parent_id=null, updated_at=now() where system_key='news';
  update public.site_menu_items set display_order=40, visible=true, parent_id=null, updated_at=now() where system_key='matches';
  update public.site_menu_items set display_order=50, visible=true, parent_id=null, updated_at=now() where system_key='statistics';
  update public.site_menu_items set display_order=60, visible=true, parent_id=null, updated_at=now() where system_key='standings';
  update public.site_menu_items set display_order=70, visible=true, parent_id=null, href='/club/about', updated_at=now() where system_key='club';
  update public.site_menu_items set display_order=80, visible=true, parent_id=null, updated_at=now() where system_key='media';
  update public.site_menu_items set display_order=90, visible=false, parent_id=null, updated_at=now() where system_key='academy';
  update public.site_menu_items set display_order=100, visible=false, parent_id=null, updated_at=now() where system_key='partners';
end $$;

notify pgrst, 'reload schema';
