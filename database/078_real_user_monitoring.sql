-- FC Edineț v2.30.14 — privacy-minimized field performance and JS error counts.
-- Requires server-only SUPABASE_SECRET_KEY and ANALYTICS_IP_SALT to be configured.
-- Run ONCE in Supabase SQL Editor before installing v2.30.14.
-- Stores NO IP, cookies, user IDs, user-agent strings, query parameters,
-- unhandled-rejection details, exception messages or stack traces.

create table if not exists public.rum_samples (
  id bigint generated always as identity primary key,
  recorded_at timestamptz not null default now(),
  route_key text not null,
  metric text not null check (metric in ('LCP','INP','CLS','FCP','TTFB','JS_ERROR','UNHANDLED_REJECTION')),
  value numeric(12,3) not null check (value >= 0 and value <= 120000),
  device_type text not null check (device_type in ('mobile','tablet','desktop')),
  release text not null check (length(release) between 1 and 24)
);
create index if not exists rum_samples_date_idx on public.rum_samples(recorded_at desc);
create index if not exists rum_samples_metric_date_idx on public.rum_samples(metric, recorded_at desc);

create table if not exists public.rum_ingest_rate (
  hour_start timestamptz not null,
  client_hash text not null check (length(client_hash)=64),
  hits integer not null default 0 check (hits >= 0 and hits <= 90),
  primary key (hour_start, client_hash)
);

alter table public.rum_samples enable row level security;
alter table public.rum_ingest_rate enable row level security;
-- No anon/authenticated policies or grants. Service role only, invoked on server.
revoke all on public.rum_samples from anon, authenticated;
revoke all on public.rum_ingest_rate from anon, authenticated;
grant select, insert, delete on public.rum_samples to service_role;
grant select, insert, update, delete on public.rum_ingest_rate to service_role;
grant usage, select on sequence public.rum_samples_id_seq to service_role;

create or replace function public.record_rum_sample_v1(
  p_client_hash text, p_route_key text, p_metric text,
  p_value numeric, p_device_type text, p_release text
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare rate_hits integer;
begin
  if length(p_client_hash) <> 64 or p_client_hash !~ '^[0-9a-f]+$'
     or p_route_key not in (
       '/', '/news','/news/:slug','/matches','/matches/:id','/team','/team/:slug',
       '/standings','/statistics','/club','/club/history','/club/history/:slug',
       '/club/seasons','/club/seasons/:slug','/club/archive','/club/hall-of-fame',
       '/media','/media/:slug','/academy','/partners'
     )
     or p_metric not in ('LCP','INP','CLS','FCP','TTFB','JS_ERROR','UNHANDLED_REJECTION')
     or p_device_type not in ('mobile','tablet','desktop')
     or p_value is null or p_value < 0 or p_value > 120000
     or (p_metric = 'CLS' and p_value > 10)
     or (p_metric in ('JS_ERROR','UNHANDLED_REJECTION') and p_value <> 1)
     or p_release is null or length(p_release) > 24 then
    return false;
  end if;

  -- Atomic hourly per-network rate limit. Only a rotating HMAC is retained.
  insert into public.rum_ingest_rate(hour_start,client_hash,hits)
    values (date_trunc('hour',now()),p_client_hash,1)
    on conflict (hour_start,client_hash) do update
      set hits=public.rum_ingest_rate.hits+1
      where public.rum_ingest_rate.hits < 90
    returning hits into rate_hits;
  if rate_hits is null then return false; end if;

  insert into public.rum_samples(route_key,metric,value,device_type,release)
    values (p_route_key,p_metric,p_value,p_device_type,p_release);

  -- Opportunistic retention: samples >35 days, short-lived rate keys >2 days.
  if random() < 0.01 then
    delete from public.rum_samples where recorded_at < now() - interval '35 days';
    delete from public.rum_ingest_rate where hour_start < now() - interval '2 days';
  end if;
  return true;
end;
$$;
revoke all on function public.record_rum_sample_v1(text,text,text,numeric,text,text) from public, anon, authenticated;
grant execute on function public.record_rum_sample_v1(text,text,text,numeric,text,text) to service_role;

-- Optional manual cleanup (same retention limits), if needed after long periods
-- with little traffic:
-- delete from public.rum_samples where recorded_at < now() - interval '35 days';
-- delete from public.rum_ingest_rate where hour_start < now() - interval '2 days';
