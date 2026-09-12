-- FC EDINET v1.6.1
-- Безопасное управление зарегистрированными пользователями и ролями.
-- Запускать ПОСЛЕ 004_auth_profiles.sql.

-- 1. Только администратор может получить список аккаунтов.
-- Функция SECURITY DEFINER нужна, чтобы безопасно прочитать служебные
-- поля auth.users без service_role ключа в Next.js/Vercel.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  role public.user_role,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or coalesce(public.current_user_role() = 'admin'::public.user_role, false) is not true
  then
    raise exception 'Только администратор может просматривать пользователей.'
      using errcode = '42501';
  end if;

  return query
  select
    p.id,
    coalesce(p.email, u.email),
    p.full_name,
    p.role,
    p.created_at,
    u.email_confirmed_at,
    u.last_sign_in_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

-- 2. Только администратор может назначать роли.
-- Самому себе администратор не может случайно снять admin.
create or replace function public.admin_set_user_role(
  target_user_id uuid,
  new_role public.user_role
)
returns public.user_role
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_current_role public.user_role;
begin
  if caller_id is null
    or coalesce(public.current_user_role() = 'admin'::public.user_role, false) is not true
  then
    raise exception 'Только администратор может изменять роли.'
      using errcode = '42501';
  end if;

  select p.role
  into target_current_role
  from public.profiles p
  where p.id = target_user_id;

  if not found then
    raise exception 'Пользователь не найден.'
      using errcode = 'P0002';
  end if;

  if target_user_id = caller_id
    and target_current_role = 'admin'::public.user_role
    and new_role <> 'admin'::public.user_role
  then
    raise exception 'Нельзя снять роль администратора у собственного аккаунта.'
      using errcode = '42501';
  end if;

  update public.profiles
  set role = new_role
  where id = target_user_id;

  return new_role;
end;
$$;

-- 3. Не оставляем функции открытыми для anon/public.
revoke all on function public.admin_list_users() from public, anon, authenticated;
revoke all on function public.admin_set_user_role(uuid, public.user_role) from public, anon, authenticated;

grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_user_role(uuid, public.user_role) to authenticated;
