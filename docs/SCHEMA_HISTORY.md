# SCHEMA_HISTORY.md

Chronological record of every database migration in `packages/db`: what
changed, why, and which task introduced it. No migration exists yet — the
database foundation (`@canadian-plans/db` real Drizzle schema, RLS policies,
`withTenantTx`) is built in T4.

Each future entry follows this shape:

```
## <migration file name>

Task: T<n>
Date: <date applied>

### Change

<tables/columns/policies added or changed>

### Why

<the requirement or invariant this satisfies>

### RLS

<policies added/changed, or "none — see invariant N for why">
```
