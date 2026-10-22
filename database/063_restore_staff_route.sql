-- v2.28.4: keep the coaching staff as a first-class public route.
update public.site_menu_items
set href = '/staff',
    label_ru = 'Тренерский штаб',
    label_ro = 'Staff tehnic',
    updated_at = now()
where system_key = 'team_staff';
