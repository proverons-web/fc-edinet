-- v2.28.3: keep the public staff entry on the proven /team route.
update public.site_menu_items
set href = '/team?view=staff', label_ru = 'Тренерский штаб', label_ro = 'Staff tehnic'
where system_key = 'team_staff';
