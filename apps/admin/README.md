# Admin console

Next.js staff-facing admin console. Every backend call goes through the shared
typed client in `@canadian-plans/contracts` (`src/lib/api.ts`), authorized with
the staff Supabase access token.

## Configuration

`src/lib/api.ts` resolves the backend origin from `NEXT_PUBLIC_API_BASE_URL`
(falling back to `API_BASE_URL`, then `http://localhost:4000` for local dev).
In production this points at the Railway-hosted backend
(`https://backend-production-ebbb6.up.railway.app`). The backend's
`ADMIN_ORIGIN` variable must match this app's public origin so its CORS policy
admits requests from here.

Errors go to the Sentry project `canadian-plans-admin` through `NEXT_PUBLIC_SENTRY_DSN`
(set in Vercel production on 22 October 2026; `src/lib/error-tracking.ts` posts scrubbed
events without the Sentry SDK; `src/instrumentation.ts` reports server-side errors). The value is read at build time, so a change needs a new
admin build; a redeploy of the same commit is skipped by the `affected-builds` ignore step.

## Lead data model

Owners and staff granted **Manage data model** use Settings → Data model → Leads.
Fields supports all twelve typed controls, stable keys, option labels/colours,
deactivation and deletion only when empty. Settings holds the object name and
default sort; owners grant the permission there. Layout arranges sections and
fields per lead type, using drag and drop or labelled move buttons/selectors.

The leads list uses POST search, typed filters, ordered columns and personal
server-saved views. Only the view ID and lead type appear in its URL. Lead details
use the saved layout, typed inline edits and a value-free activity timeline.
Sensitive fields require personal-data access and cannot be list columns,
filters, sorts or exports. See [the design and release note](../../docs/LEAD_DATA_MODEL.md).
