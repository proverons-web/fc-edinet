# FC Edineț v2.30.27 — Users, Roles and Edit on Site

## Account creation

- **Admin API only**: uses `auth.admin.createUser` from a server-only Supabase client.
- Fail closed when `SUPABASE_SECRET_KEY` or a legacy service role key is unavailable.
- No fallback through public `signUp`, which can fail because of signup restrictions, email confirmations, throttling, or CAPTCHA.
- Assign the selected profile role after creating the account, and roll back the newly created Auth user if profile setup fails.
- Clear in-admin error messages; password is never stored in application tables.

## Roles

| Role | Administrative routes |
|---|---|
| Admin | All |
| Editor | News, media, comments, players, staff, matches, competitions, match center, standings |
| Author | Own news only |
| Fan | Account only |

Defence in depth: **server actions** for excluded modules call `requireAdmin`, protected routes have admin-only layouts, and an **RLS migration** adds restrictive INSERT/UPDATE/DELETE policies for global site/club configuration tables. An extra trigger protects the last administrator from accidental demotion/deletion.

## Direct editing

Authenticated editors and admins see a compact pencil on eligible public pages. The button calls a server-validated resolver that maps existing public slugs to database IDs, then sends users directly to their permitted editing form. It does not expose public write APIs or accept arbitrary redirect URLs.

## Compatibility and limitations

- Migration **085** required; do not apply older migrations again.
- The link jumps into the existing editor. It is not an in-place WYSIWYG editor overlay.
- Club history, global site design, translations, analytics and system tools are now admin-only.
- Existing public data and roles are preserved; no automatic change to current users.
- This ZIP contains a **safe patch installer**, not a stand-alone full source archive. It requires the local complete v2.30.26 directory and performs a guarded file update with backups.
- Full Next.js typecheck/build must finish on the Windows project before deploying.
