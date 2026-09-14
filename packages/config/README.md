# @canadian-plans/config

Shared, non-published tooling configuration: strict TypeScript base
(`tsconfig.base.json`), ESLint flat-config building blocks (`eslint.js`,
including the `@canadian-plans/db` import-boundary rule), Prettier config,
and Vitest/Playwright defaults.

## Single responsibility

Own the repo's linting, type-checking, formatting, and test-runner
conventions in one place so no app or package hand-rolls its own.

## Must never import

- `@canadian-plans/db`, `@canadian-plans/adapters`, `@canadian-plans/types`,
  `@canadian-plans/contracts`, `@canadian-plans/ui` — this package sits
  below all of them and must stay dependency-free of workspace code.
- Any provider SDK or secret.
