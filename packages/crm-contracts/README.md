# @canadian-plans/crm-contracts

A copy of `packages/contracts` from `Canadian-Plans/canadianplans-crm` (commit
`8a08edb`, 2026-11-12): the request and response schemas and the typed client
of the CRM backend this storefront calls. `@canadian-plans/crm-types` is the
copy of its `packages/types`.

Do not edit these files here. When the CRM's website API changes, copy the two
packages again (`src/` only, without the tests and `openapi.ts`), rename the
`@canadian-plans/types` import to `@canadian-plans/crm-types` and update the
commit above.

The storefront uses only the website-facing part: `createBackendClient`,
`BackendError`, the lead, plan, upload and tracking schemas.
