# @canadian-plans/ui

Shared shadcn/ui-based components and design tokens (colour, radius,
spacing, font — defined once) for every frontend. No content, no brand.

## Single responsibility

Give every frontend the same primitives so brand look-and-feel differences
live in each site's own theme layer, not in copy-pasted components.

## Must never import

- `@canadian-plans/db`, `@canadian-plans/adapters` — this package is bundled
  into the browser and must never carry a provider secret or DB code.
- Any app (`apps/*`).
