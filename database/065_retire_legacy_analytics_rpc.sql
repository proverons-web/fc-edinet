-- FC Edinet v2.28.18 — retire legacy browser-ID analytics RPCs.
-- Current public tracking uses record_site_visit_v3 with privacy-preserving IP HMAC identifiers.

revoke all on function public.record_site_visit(text, text, text) from public, anon, authenticated;
revoke all on function public.record_site_visit_v2(text, text, text, text, text, integer, integer, text) from public, anon, authenticated;

notify pgrst, 'reload schema';
