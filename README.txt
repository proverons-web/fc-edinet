FC EDINET v2.30.27 PATCH — NOT A FULL PROJECT

This update applies to the user's existing local v2.30.26 source folder.
Place the whole UPDATE_FC_EDINET_v2.30.27 folder inside v2.30.26
(where package.json is), and run APPLY_FC_EDINET_2.30.27.bat.

The installer verifies matching source fragments before writing any file;
unknown versions and diverged files are rejected. Existing files are backed
up outside the project to FC_Edinet_UpdateBackups_v2.30.27.

After patch: read STEP-2.30.27.txt, configure a server-only Supabase key,
apply database/085_admin_editor_role_boundaries.sql (after a database backup),
run QA, and then DEPLOY_FC_EDINET.bat.

Nothing in this kit remotely changes GitHub, Vercel or Supabase by itself.

ALTERNATIVE: BUILD_FULL_FROM_GITHUB.bat creates a new complete project from
reviewed official commit f8e30f0ad90c62bc9fc97363b55827cde7a71e16
and applies this update. Requires network, Git and Node.js. It does NOT deploy.
