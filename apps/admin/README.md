# Admin console

Next.js staff-facing admin console. Every backend call goes through the shared
typed client in `@canadian-plans/contracts` (`src/lib/api.ts`), authorized with
the staff Supabase access token.

## Configuration

`src/lib/api.ts` resolves the backend origin from `NEXT_PUBLIC_API_BASE_URL`
(falling back to `API_BASE_URL`, then `http://localhost:4000` for local dev).
In production `SITE_1_BACKEND_URL` points at the Railway-hosted backend
(`https://backend-production-ebbb6.up.railway.app`).

In production this points at the Railway-hosted backend
(`https://backend-production-ebbb6.up.railway.app`). The backend's
`ADMIN_ORIGIN` variable must match this app's public origin so its CORS policy
admits requests from here.
