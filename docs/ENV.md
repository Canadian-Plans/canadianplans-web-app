# Environment variables

This file intentionally lists variable names only. Store all values in the
password manager and in the appropriate deployment environment; never commit
them or paste them into chat.

## Runtime

- `NODE_ENV`
- `PORT`
- `API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `VITE_API_BASE_URL`

## Supabase

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

## Cloudflare R2

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_ENDPOINT`

## Sanity

- `SANITY_PROJECT_ID`
- `SANITY_DATASET`
- `SANITY_API_VERSION`
- `SANITY_API_TOKEN`

## AWS SES

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `SES_FROM_EMAIL`
- `SES_FROM_NAME`

## Observability and analytics

- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `VITE_SENTRY_DSN`
- `UMAMI_WEBSITE_ID`
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`
- `VITE_UMAMI_WEBSITE_ID`

## Backblaze B2 backups

- `B2_APPLICATION_KEY_ID`
- `B2_APPLICATION_KEY`
- `B2_BUCKET`
- `B2_ENDPOINT`
