-- FC Edinet v2.28.18 — IP-unique production analytics
-- Raw IP addresses are never stored. The application sends only a server-side HMAC hash.
-- Legacy browser-ID analytics are preserved but excluded from current analytics calculations.

alter table public.site_visitors
  add column if not exists identity_version text not null default 'browser_v1';

alter table public.site_pageviews
  add column if not exists identity_version text not null default 'browser_v1';

create index if not exists site_visitors_identity_last_seen_idx
  on public.site_visitors (identity_version, last_seen desc);

create index if not exists site_pageviews_identity_visited_idx
  on public.site_pageviews (identity_version, visited_at desc);

create or replace function public.record_site_visit_v3(
  p_visitor_hash text,
  p_path text,
  p_referrer text default null,
  p_country_code text default null,
  p_device_type text default null,
  p_viewport_width integer default null,
  p_viewport_height integer default null,
  p_locale text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
  v_referrer text;
  v_country text;
  v_device text;
  v_width integer;
  v_height integer;
  v_locale text;
begin
  if p_visitor_hash is null or p_visitor_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid visitor identifier.' using errcode = '22023';
  end if;

  v_path := left(coalesce(nullif(trim(p_path), ''), '/'), 500);
  if left(v_path, 1) <> '/' then v_path := '/' || v_path; end if;
  v_referrer := nullif(left(trim(coalesce(p_referrer, '')), 500), '');

  v_country := upper(nullif(trim(coalesce(p_country_code, '')), ''));
  if v_country is not null and v_country !~ '^[A-Z]{2}$' then v_country := null; end if;

  v_device := lower(nullif(trim(coalesce(p_device_type, '')), ''));
  if v_device not in ('desktop', 'tablet', 'mobile') then v_device := 'unknown'; end if;

  v_width := case when p_viewport_width between 200 and 10000 then p_viewport_width else null end;
  v_height := case when p_viewport_height between 200 and 10000 then p_viewport_height else null end;

  v_locale := lower(nullif(trim(coalesce(p_locale, '')), ''));
  if v_locale like 'ro%' then v_locale := 'ro';
  elsif v_locale like 'ru%' then v_locale := 'ru';
  else v_locale := 'other';
  end if;

  insert into public.site_visitors (
    visitor_hash, first_seen, last_seen, pageviews, last_path, first_referrer, last_referrer,
    last_country_code, last_device_type, last_viewport_width, last_viewport_height, last_locale,
    identity_version
  ) values (
    p_visitor_hash, now(), now(), 1, v_path, v_referrer, v_referrer,
    v_country, v_device, v_width, v_height, v_locale,
    'ip_v1'
  )
  on conflict (visitor_hash) do update
    set last_seen = excluded.last_seen,
        pageviews = public.site_visitors.pageviews + 1,
        last_path = excluded.last_path,
        last_referrer = excluded.last_referrer,
        last_country_code = coalesce(excluded.last_country_code, public.site_visitors.last_country_code),
        last_device_type = excluded.last_device_type,
        last_viewport_width = excluded.last_viewport_width,
        last_viewport_height = excluded.last_viewport_height,
        last_locale = excluded.last_locale,
        identity_version = 'ip_v1';

  insert into public.site_pageviews (
    visitor_hash, path, referrer, visited_at, country_code, device_type,
    viewport_width, viewport_height, locale, identity_version
  ) values (
    p_visitor_hash, v_path, v_referrer, now(), v_country, v_device,
    v_width, v_height, v_locale, 'ip_v1'
  );
end;
$$;

create or replace function public.admin_site_analytics(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 365));
  v_start timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
  v_prev_start timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)) * 2);
  v_result jsonb;
begin
  if auth.uid() is null
    or coalesce(public.current_user_role() in ('editor'::public.user_role, 'admin'::public.user_role), false) is not true
  then
    raise exception 'Недостаточно прав для просмотра статистики сайта.' using errcode = '42501';
  end if;

  with period_pageviews as (
    select *
    from public.site_pageviews
    where identity_version = 'ip_v1' and visited_at >= v_start
  ),
  period_counts as (
    select visitor_hash, count(*)::bigint as pageviews
    from period_pageviews
    group by visitor_hash
  ),
  period_latest as (
    select distinct on (visitor_hash)
      visitor_hash,
      coalesce(country_code, 'XX') as country_code,
      coalesce(device_type, 'unknown') as device_type,
      viewport_width,
      viewport_height,
      coalesce(locale, 'unknown') as locale
    from period_pageviews
    order by visitor_hash, visited_at desc
  ),
  period_dimensions as (
    select l.*, c.pageviews
    from period_latest l
    join period_counts c using (visitor_hash)
  )
  select jsonb_build_object(
    'identity_mode', 'ip_v1',
    'period_days', v_days,
    'summary', jsonb_build_object(
      'unique_24h', (select count(distinct visitor_hash) from public.site_pageviews where identity_version = 'ip_v1' and visited_at >= now() - interval '24 hours'),
      'unique_7d', (select count(distinct visitor_hash) from public.site_pageviews where identity_version = 'ip_v1' and visited_at >= now() - interval '7 days'),
      'unique_30d', (select count(distinct visitor_hash) from public.site_pageviews where identity_version = 'ip_v1' and visited_at >= now() - interval '30 days'),
      'unique_total', (select count(*) from public.site_visitors where identity_version = 'ip_v1'),
      'pageviews_24h', (select count(*) from public.site_pageviews where identity_version = 'ip_v1' and visited_at >= now() - interval '24 hours'),
      'pageviews_7d', (select count(*) from public.site_pageviews where identity_version = 'ip_v1' and visited_at >= now() - interval '7 days'),
      'pageviews_30d', (select count(*) from public.site_pageviews where identity_version = 'ip_v1' and visited_at >= now() - interval '30 days'),
      'pageviews_total', (select count(*) from public.site_pageviews where identity_version = 'ip_v1'),
      'period_unique', (select count(*) from period_counts),
      'period_pageviews', (select count(*) from period_pageviews),
      'period_new', (select count(*) from public.site_visitors where identity_version = 'ip_v1' and first_seen >= v_start),
      'period_returning', (
        select count(*)
        from period_counts pc
        join public.site_visitors v using (visitor_hash)
        where v.identity_version = 'ip_v1' and v.first_seen < v_start
      )
    ),
    'comparison', jsonb_build_object(
      'current_unique', (select count(distinct visitor_hash) from public.site_pageviews where identity_version = 'ip_v1' and visited_at >= v_start),
      'previous_unique', (select count(distinct visitor_hash) from public.site_pageviews where identity_version = 'ip_v1' and visited_at >= v_prev_start and visited_at < v_start),
      'current_pageviews', (select count(*) from public.site_pageviews where identity_version = 'ip_v1' and visited_at >= v_start),
      'previous_pageviews', (select count(*) from public.site_pageviews where identity_version = 'ip_v1' and visited_at >= v_prev_start and visited_at < v_start),
      'current_new', (select count(*) from public.site_visitors where identity_version = 'ip_v1' and first_seen >= v_start),
      'previous_new', (select count(*) from public.site_visitors where identity_version = 'ip_v1' and first_seen >= v_prev_start and first_seen < v_start)
    ),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', d.day::text,
        'unique', coalesce(s.unique_visitors, 0),
        'pageviews', coalesce(s.pageviews, 0)
      ) order by d.day)
      from generate_series((current_date - (v_days - 1))::timestamp, current_date::timestamp, interval '1 day') as d(day)
      left join (
        select (visited_at at time zone 'Europe/Chisinau')::date as day,
               count(distinct visitor_hash)::bigint as unique_visitors,
               count(*)::bigint as pageviews
        from public.site_pageviews
        where identity_version = 'ip_v1' and visited_at >= v_start
        group by 1
      ) s on s.day = d.day::date
    ), '[]'::jsonb),
    'top_pages', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.pageviews desc, x.unique_visitors desc)
      from (
        select path, count(*)::bigint as pageviews, count(distinct visitor_hash)::bigint as unique_visitors
        from period_pageviews
        group by path
        order by pageviews desc, unique_visitors desc
        limit 20
      ) x
    ), '[]'::jsonb),
    'referrers', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.pageviews desc)
      from (
        select coalesce(nullif(referrer, ''), 'Прямые заходы') as source,
               count(*)::bigint as pageviews,
               count(distinct visitor_hash)::bigint as unique_visitors
        from period_pageviews
        group by 1
        order by pageviews desc
        limit 15
      ) x
    ), '[]'::jsonb),
    'countries', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.unique_visitors desc, x.pageviews desc)
      from (
        select country_code,
               count(*)::bigint as unique_visitors,
               sum(pageviews)::bigint as pageviews
        from period_dimensions
        group by country_code
        order by unique_visitors desc, pageviews desc
        limit 30
      ) x
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.unique_visitors desc, x.pageviews desc)
      from (
        select device_type as device,
               count(*)::bigint as unique_visitors,
               sum(pageviews)::bigint as pageviews
        from period_dimensions
        group by device_type
        order by unique_visitors desc, pageviews desc
      ) x
    ), '[]'::jsonb),
    'locales', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.unique_visitors desc, x.pageviews desc)
      from (
        select locale,
               count(*)::bigint as unique_visitors,
               sum(pageviews)::bigint as pageviews
        from period_dimensions
        group by locale
        order by unique_visitors desc, pageviews desc
      ) x
    ), '[]'::jsonb),
    'viewports', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.sort_order)
      from (
        select bucket,
               count(*)::bigint as unique_visitors,
               sum(pageviews)::bigint as pageviews,
               min(sort_order) as sort_order
        from (
          select visitor_hash, pageviews,
                 case
                   when viewport_width is null then 'Не определено'
                   when viewport_width < 480 then '< 480 px'
                   when viewport_width < 768 then '480–767 px'
                   when viewport_width < 1024 then '768–1023 px'
                   when viewport_width < 1440 then '1024–1439 px'
                   else '1440+ px'
                 end as bucket,
                 case
                   when viewport_width is null then 99
                   when viewport_width < 480 then 1
                   when viewport_width < 768 then 2
                   when viewport_width < 1024 then 3
                   when viewport_width < 1440 then 4
                   else 5
                 end as sort_order
          from period_dimensions
        ) q
        group by bucket
        order by min(sort_order)
      ) x
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.last_seen desc)
      from (
        select left(visitor_hash, 8) as visitor,
               first_seen, last_seen, pageviews, last_path,
               coalesce(last_referrer, 'Прямой заход') as referrer,
               last_country_code as country_code,
               last_device_type as device,
               last_viewport_width as viewport_width,
               last_viewport_height as viewport_height,
               last_locale as locale
        from public.site_visitors
        where identity_version = 'ip_v1'
        order by last_seen desc
        limit 30
      ) x
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

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
      select (visited_at at time zone 'Europe/Chisinau')::date as bucket,
             count(distinct visitor_hash)::bigint as unique_visitors,
             count(*)::bigint as pageviews
      from public.site_pageviews
      where identity_version = 'ip_v1' and visited_at >= v_start
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
      select date_trunc('week', visited_at at time zone 'Europe/Chisinau')::date as bucket,
             count(distinct visitor_hash)::bigint as unique_visitors,
             count(*)::bigint as pageviews
      from public.site_pageviews
      where identity_version = 'ip_v1' and visited_at >= v_start
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
      select date_trunc('month', visited_at at time zone 'Europe/Chisinau')::date as bucket,
             count(distinct visitor_hash)::bigint as unique_visitors,
             count(*)::bigint as pageviews
      from public.site_pageviews
      where identity_version = 'ip_v1' and visited_at >= v_start
      group by 1
    ) s on s.bucket = d.month_start::date;
  end if;

  return coalesce(v_result, jsonb_build_object('granularity', 'day', 'rows', '[]'::jsonb));
end;
$$;

revoke all on function public.record_site_visit_v2(text, text, text, text, text, integer, integer, text) from public, anon, authenticated;
revoke all on function public.record_site_visit_v3(text, text, text, text, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.record_site_visit_v3(text, text, text, text, text, integer, integer, text) to anon, authenticated;

revoke all on function public.admin_site_analytics(integer) from public, anon, authenticated;
grant execute on function public.admin_site_analytics(integer) to authenticated;

revoke all on function public.admin_site_traffic_chart(integer) from public, anon, authenticated;
grant execute on function public.admin_site_traffic_chart(integer) to authenticated;

notify pgrst, 'reload schema';
