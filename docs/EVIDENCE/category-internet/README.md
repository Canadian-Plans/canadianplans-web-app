# Category Internet design evidence

This directory contains implementation screenshots, map/hero/coverage/plans/footer crops, natural-size Figma source exports, and the browser verification report for the Vancouver local-city page and Ontario province hub.

Run the verifier from the workspace root with the shared site preview server available:

```powershell
$env:AUDIT_ORIGIN = 'http://127.0.0.1:3127'
pnpm --filter site-1 exec node scripts/verify-category-internet.mjs
```

The pages are noindex previews. All provider and coverage details, prices, review excerpts, and installation copy shown in the Figma reference are unverified sample content. The address checker returns local fixture states only.
