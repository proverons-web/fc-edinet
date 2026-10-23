-- FC Edinet v2.28.18 — guard public analytics ingest with a server-only proof.
-- The stored value is only SHA-256 of the production ANALYTICS_IP_SALT; the salt itself is never stored in the database or repository.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.analytics_ingest_config (
  config_key text primary key,
  token_hash text not null,
  updated_at timestamptz not null default now()
);

revoke all on table private.analytics_ingest_config from public, anon, authenticated;

insert into private.analytics_ingest_config (config_key, token_hash, updated_at)
values ('ip_v1', '0caf722e5c08694c78b6d141cb63187dc4b9a7b1f1ac4fcab3294186304b2d6b', now())
on conflict (config_key) do update
set token_hash = excluded.token_hash,
    updated_at = excluded.updated_at;

create or replace function public.record_site_visit_v4(
  p_ingest_proof text,
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
  v_expected_hash text;
  v_actual_hash text;
begin
  select token_hash
    into v_expected_hash
    from private.analytics_ingest_config
   where config_key = 'ip_v1';

  if v_expected_hash is null or p_ingest_proof is null then
    raise exception 'Analytics ingest is not configured.' using errcode = '42501';
  end if;

  v_actual_hash := encode(extensions.digest(convert_to(p_ingest_proof, 'UTF8'), 'sha256'), 'hex');
  if v_actual_hash <> v_expected_hash then
    raise exception 'Invalid analytics ingest proof.' using errcode = '42501';
  end if;

  perform public.record_site_visit_v3(
    p_visitor_hash,
    p_path,
    p_referrer,
    p_country_code,
    p_device_type,
    p_viewport_width,
    p_viewport_height,
    p_locale
  );
end;
$$;

revoke all on function public.record_site_visit_v3(text, text, text, text, text, integer, integer, text) from public, anon, authenticated;
revoke all on function public.record_site_visit_v4(text, text, text, text, text, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.record_site_visit_v4(text, text, text, text, text, text, integer, integer, text) to anon, authenticated;

notify pgrst, 'reload schema';
