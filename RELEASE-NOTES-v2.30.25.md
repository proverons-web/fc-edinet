# FC Edineț v2.30.25 — Fan Notifications

Account-only, read-only notification events for favorited matches. PostgreSQL row-trigger creates events after schedule changes, cancellations and published results. No email, push, polling agent or external paid services.

* RLS: account owner can SELECT own rows and UPDATE only `read_at`; no client INSERT/DELETE.
* Trusted trigger: `private.create_fan_match_notification`, SECURITY DEFINER, trigger-only, not exposed via public schema.
* Notification creation respects `profiles.notifications_enabled` and requires an existing `favorite_matches` row.
* Stable event UUID for each relevant match update; no event when values are unchanged; notifications cascade-delete when unfollowed.
* RU/RO localized account UI, timezone `Europe/Chisinau`, dashboard preview, unread count.
* Migration: `database/084_fan_notifications.sql`; no backfill of previous match changes.
