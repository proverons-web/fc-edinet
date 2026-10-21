-- FC Edinet v2.14.1 — exact analytics chart aggregation
-- No data is removed or rewritten. The admin dashboard calls this alongside admin_site_analytics().

create or replace function public.admin_site_traffic_chart(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 365));
  v_start timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
  v_result jsonb;
begin
  if auth.uid() is null
    or coalesce(public.current_user_role() in ('editor'::public.user_role, 'admin'::public.user_role), false) is not true
  then
    raise exception 'Недостаточно прав для просмотра статистики сайта.' using errcode = '42501';
  end if;

  if v_days <= 30 then
    select jsonb_build_object(
      'granularity', 'day',
      'rows', coalesce(jsonb_agg(jsonb_build_object(
        'start', d.day::date::text,
        'end', d.day::date::text,
        'unique', coalesce(s.unique_visitors, 0),
        'pageviews', coalesce(s.pageviews, 0)
      ) order by d.day), '[]'::jsonb)
    ) into v_result
    from generate_series((current_date - (v_days - 1))::timestamp, current_date::timestamp, interval '1 day') d(day)
    left join (
      select (visited_at at time zone 'Europe/Chisinau')::date bucket,
             count(distinct visitor_hash)::bigint unique_visitors,
             count(*)::bigint pageviews
      from public.site_pageviews
      where visited_at >= v_start
      group by 1
    ) s on s.bucket = d.day::date;
  elsif v_days <= 90 then
    select jsonb_build_object(
      'granularity', 'week',
      'rows', coalesce(jsonb_agg(jsonb_build_object(
        'start', d.week_start::date::text,
        'end', least((d.week_start + interval '6 days')::date, current_date)::text,
        'unique', coalesce(s.unique_visitors, 0),
        'pageviews', coalesce(s.pageviews, 0)
      ) order by d.week_start), '[]'::jsonb)
    ) into v_result
    from generate_series(
      date_trunc('week', (current_date - (v_days - 1))::timestamp),
      date_trunc('week', current_date::timestamp), interval '1 week'
    ) d(week_start)
    left join (
      select date_trunc('week', visited_at at time zone 'Europe/Chisinau')::date bucket,
             count(distinct visitor_hash)::bigint unique_visitors,
             count(*)::bigint pageviews
      from public.site_pageviews
      where visited_at >= v_start
      group by 1
    ) s on s.bucket = d.week_start::date;
  else
    select jsonb_build_object(
      'granularity', 'month',
      'rows', coalesce(jsonb_agg(jsonb_build_object(
        'start', d.month_start::date::text,
        'end', least((d.month_start + interval '1 month - 1 day')::date, current_date)::text,
        'unique', coalesce(s.unique_visitors, 0),
        'pageviews', coalesce(s.pageviews, 0)
      ) order by d.month_start), '[]'::jsonb)
    ) into v_result
    from generate_series(
      date_trunc('month', (current_date - (v_days - 1))::timestamp),
      date_trunc('month', current_date::timestamp), interval '1 month'
    ) d(month_start)
    left join (
      select date_trunc('month', visited_at at time zone 'Europe/Chisinau')::date bucket,
             count(distinct visitor_hash)::bigint unique_visitors,
             count(*)::bigint pageviews
      from public.site_pageviews
      where visited_at >= v_start
      group by 1
    ) s on s.bucket = d.month_start::date;
  end if;

  return coalesce(v_result, jsonb_build_object('granularity', 'day', 'rows', '[]'::jsonb));
end;
$$;

revoke all on function public.admin_site_traffic_chart(integer) from public, anon, authenticated;
grant execute on function public.admin_site_traffic_chart(integer) to authenticated;

notify pgrst, 'reload schema';
