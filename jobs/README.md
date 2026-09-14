# jobs

Outbox handlers invoked by `apps/backend`'s Vercel Cron routes (transactional
email/analytics/external-event sends, queued after commit per
PLATFORM_CONTEXT.md §4 invariant 7). Nothing here yet — the outbox and
runner are built in T15.

Separately authorized offline backup/restore/retention tooling is **not**
part of this cron-invoked jobs directory; it lives under `scripts/` and is
added in T24, with its own explicit ESLint allowlist entry.
