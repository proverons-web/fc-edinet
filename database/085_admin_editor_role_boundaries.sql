-- FC Edinet v2.30.27 — database authorization boundaries.
-- Apply after v2.30.26; idempotent. Does not edit existing user roles.
BEGIN;

-- Historical editor policies allowed writing into site-wide configuration,
-- history, partners and global designs. Keep SELECT rules unchanged for the
-- public site; add restrictive policies to all THREE write operations.
DO $scope$
DECLARE
  item text;
  rel regclass;
  tables text[] := ARRAY[
    'club_achievements','club_archive_albums','club_archive_photos',
    'club_hall_of_fame','club_history_events','club_leadership','club_profile',
    'content_page_layouts','content_page_published',
    'homepage_blocks','homepage_design_draft','homepage_design_versions',
    'homepage_hero','homepage_sections','homepage_settings',
    'partners','site_custom_pages','site_global_design_drafts',
    'site_global_design_versions','site_global_designs','site_menu_items',
    'site_page_design_drafts','site_page_design_versions','site_page_designs',
    'translation_diagnostics'
  ];
BEGIN
  FOREACH item IN ARRAY tables LOOP
    rel := to_regclass('public.' || quote_ident(item));
    IF rel IS NULL THEN
      RAISE EXCEPTION 'Required table public.% is missing. Apply earlier FC Edinet migrations first.', item;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS admin_only_insert_2327 ON public.%I', item);
    EXECUTE format('CREATE POLICY admin_only_insert_2327 ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT public.current_user_role()) = ''admin''::public.user_role)', item);
    EXECUTE format('DROP POLICY IF EXISTS admin_only_update_2327 ON public.%I', item);
    EXECUTE format('CREATE POLICY admin_only_update_2327 ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT public.current_user_role()) = ''admin''::public.user_role) WITH CHECK ((SELECT public.current_user_role()) = ''admin''::public.user_role)', item);
    EXECUTE format('DROP POLICY IF EXISTS admin_only_delete_2327 ON public.%I', item);
    EXECUTE format('CREATE POLICY admin_only_delete_2327 ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING ((SELECT public.current_user_role()) = ''admin''::public.user_role)', item);
  END LOOP;
END;
$scope$;

-- Prevent accidental loss of the final administrator, including when an
-- admin account is deleted. All role updates by existing admin RPCs still work.
-- Advisory lock serializes concurrent attempts to demote different admins.
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.protect_last_fc_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $function$
DECLARE
  remaining_admins bigint;
BEGIN
  IF OLD.role <> 'admin'::public.user_role THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.role = 'admin'::public.user_role THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(23027, 1);
  SELECT count(*) INTO remaining_admins FROM public.profiles
    WHERE role = 'admin'::public.user_role AND id <> OLD.id;
  IF remaining_admins < 1 THEN
    RAISE EXCEPTION 'Cannot remove the last FC Edinet administrator.' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.protect_last_fc_admin() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS protect_last_fc_admin ON public.profiles;
CREATE TRIGGER protect_last_fc_admin
BEFORE UPDATE OF role OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.protect_last_fc_admin();

COMMIT;
