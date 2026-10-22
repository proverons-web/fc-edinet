-- v2.28.4: restore the canonical public coaching staff route.
update public.site_menu_items
set href = '/staff', label_ru = 'Тренерский штаб', label_ro = 'Staff tehnic'
where system_key = 'team_staff';
