# 0002 — Admin shell: shadcn/ui primitives in @canadian-plans/ui, dashboard layout, placeholder routes

Date: 14 September 2026
Status: accepted

## Context

T2 (BUILD_TASKS.md) gives `apps/admin` its real shape: a shadcn/ui-based
dashboard shell (left sidebar, top bar, content area), the first cut of the
staff route map, and a `WorkspaceSwitcher`. PLATFORM_CONTEXT.md §3 already
commits to shadcn/ui via the shadcn MCP with "shared primitives in a
workspace package" and no Figma phase; §10 names `packages/ui` as that
package. This ADR records how that got built and why, so later frontends
(site-1..3) reuse it instead of vendoring their own copy.

## Decisions

**Every shadcn primitive used here lives in `@canadian-plans/ui`, not in
`apps/admin`.** Components were pulled one at a time from the shadcn MCP
(`Button`, `Input`, `Label`, `Separator`, `Sheet`, `Skeleton`, `Tooltip`,
`DropdownMenu`, `Card`, `Avatar`, `Badge`, the `Sidebar` primitive family)
and adapted only to import from `../lib/utils` instead of the shadcn
registry's `@/registry/...` alias. `apps/admin` imports all of them from
`@canadian-plans/ui` and never runs a local shadcn `add` — the workspace
package is the only place these files exist. `SkipLink` is the one primitive
not sourced from shadcn (it isn't a registry component); it lives alongside
the others because it's shared UI, not admin-specific.

**Design tokens — colour, radius, spacing, font — are defined exactly once**,
in `packages/ui/src/styles/tokens.css`, using shadcn's standard Tailwind v4
token shape (`:root`/`.dark` CSS custom properties feeding an `@theme
inline` block: `--color-*`, `--radius-*`, `--font-sans`). Apps import it via
`@canadian-plans/ui/tokens.css` from their global stylesheet and never
redeclare a colour or radius value locally.

**The concrete palette comes from shadcn preset `b4gfJS2z4`** (style vega,
base neutral, theme **red**, radius **small** = `--radius: 0.45rem`, font
**Inter**, lucide icons — decode with `npx shadcn@latest preset decode
b4gfJS2z4`). The preset's values were captured via
`shadcn apply --preset b4gfJS2z4 --only theme` and hand-merged into
`tokens.css` rather than left in a CLI-managed `app/globals.css`, so the
single-source rule above still holds — there is no second token file and no
`components.json`. Re-running the preset means re-merging its `:root`/`.dark`
blocks into `tokens.css`, not pointing the CLI at it. The preset also carries
`--chart-1..5` (red family), included for completeness though nothing renders
charts yet. Font: the preset's `font-inter` registry item 404s upstream, so
Inter is loaded the idiomatic Next way — `next/font/google` in the admin root
layout exposes it as `--font-sans-inter`, which `tokens.css` consumes with a
system-stack fallback (`var(--font-sans-inter, ui-sans-serif), …`). Every
future frontend loads Inter the same way and inherits the same token. Because Tailwind v4's content
scanner doesn't cross a pnpm workspace symlink by default, `apps/admin/src/
app/globals.css` adds `@source '../../../../packages/ui/src'` so utility
classes referenced only inside `@canadian-plans/ui` component source (e.g.
`sr-only`) are still generated in admin's built CSS. Every future frontend
that imports this package needs the same `@source` line — noted here so it
isn't rediscovered by debugging a missing class.

**Tailwind v4 + PostCSS is new per-app plumbing, not shared.** `tailwindcss`,
`@tailwindcss/postcss`, `postcss`, and `tw-animate-css` (shadcn's replacement
for `tailwindcss-animate` under v4) are devDependencies of `apps/admin`
itself, pinned via the root `pnpm-workspace.yaml` catalog alongside the new
UI runtime deps (`class-variance-authority`, `radix-ui`, `lucide-react`,
`clsx`, `tailwind-merge`) so every frontend that adopts shadcn later pulls
the same versions. `next.config.ts` sets `transpilePackages:
['@canadian-plans/ui']` because the package ships TypeScript source directly
(no build step) — Next.js needs to transpile it like first-party app code.

**Dashboard shell: `SidebarProvider` + `Sidebar` (`collapsible="icon"`) +
`SidebarInset`, wired once in `apps/admin/src/app/w/[workspace]/layout.tsx`.**
This layout is the only thing every `/w/[workspace]/*` route shares — each
page under it renders only its content `Card`. The top bar
(`components/top-bar.tsx`) derives the active section from `usePathname()`
rather than taking it as a prop, so adding a new section later means adding
one nav entry and one route, not touching the layout or top bar.

**`WorkspaceSwitcher` is a static list, not a stub for a missing feature.**
PLATFORM_CONTEXT §4b's bootstrap model (verified staff → own memberships)
requires staff auth that doesn't exist yet, so there's no endpoint to call.
The hardcoded three-workspace list lives in `apps/admin/src/lib/
workspaces.ts` with a comment pointing at the real replacement; the gap is
also recorded in `OPEN_INPUTS.md` (created by this task — it didn't exist at
the repo root before) so it isn't mistaken for finished wiring. Switching
workspaces preserves the current section (`/w/site-1/leads` →
`/w/site-2/leads`), which only works because both pieces of state — slug and
section — are read from the URL, not component state.

**Accessibility is structural, not a pass at the end.** A `SkipLink` is the
first element in `<body>` (`apps/admin/src/app/layout.tsx`), targeting
`id="main-content"` on the `<main>` landmark each layout renders (`tabIndex=
{-1}` so it's focusable as a jump target without being in tab order twice).
Every sidebar link sets `aria-current="page"` when active. Focus rings come
free from shadcn's `focus-visible:ring-*` classes on every interactive
primitive — none were overridden. Verified in-browser this task: skip link
is the first Tab stop and becomes visible on focus; Tab order continues
through the sidebar trigger, `WorkspaceSwitcher`, then each nav item in
document order; the mobile sidebar (`<768px`, via the `Sheet`-based mobile
branch already built into shadcn's `Sidebar`) opens and closes correctly and
traps focus (Radix `Dialog` primitive underneath `Sheet`).

**Placeholder routes render real layout, not empty stubs.** `/login` and
`/denied` are full pages (outside the `/w/[workspace]` shell, each with
their own skip-link target) using shared `Card`/`Input`/`Button` primitives
with disabled/inert form controls — they prove the primitives work end to
end without wiring fake auth. The six `/w/[workspace]/*` section pages are
identical in shape (title + "no data yet" description) because there's
nothing to differentiate them until each has a real backend endpoint;
duplicating that shape six times was judged clearer than an early
abstraction over content nobody has designed yet.

**No DB access anywhere in this task.** `apps/admin` still only imports
`@canadian-plans/contracts`, `@canadian-plans/types`, and now
`@canadian-plans/ui` — never `@canadian-plans/db` — consistent with
PLATFORM_CONTEXT §4 invariant 3 and ADR 0001's lint allowlist, which this
task did not touch.

## Consequences

- Site-1/2/3 storefronts adopt `@canadian-plans/ui` the same way: add the
  Tailwind v4 devDependencies, add `transpilePackages`, import
  `tokens.css` + the `@source` line, then compose primitives — no new
  design tokens, no re-vendored shadcn components.
- Any shadcn component pulled from the MCP in a later task goes into
  `packages/ui`, never directly into an app, even for a one-off need —
  keeping the "shared primitives in a workspace package" invariant true by
  construction rather than by review.
- `WorkspaceSwitcher`'s static list is a known gap tracked in
  `OPEN_INPUTS.md`; it must be replaced by a real memberships call before
  Phase A's admin app is considered done, not left as a permanent shortcut.

## Review correction — T1/T2 audit

Admin is dark-only, as recorded by the existing dark-theme commit; shared light tokens remain available to future storefronts. The T2 shell has five workspace section routes plus login and denied (seven routes total).

Each page now has one H1 and one main landmark. `CardTitle asChild` supplies semantic headings without duplicating styles. The top bar remains outside the main landmark so the skip link bypasses it. Workspace selection reuses the shared Button, and long labels fit narrow screens. Sidebar links have explicit accessible names in collapsed mode; the brand label collapses without overflow.

Mobile navigation closes after selecting a route. Tooltip layers mount only for collapsed desktop links, so invisible tooltips cannot intercept Escape inside the mobile sheet. Sheet dismissal returns focus to the sidebar trigger. Focus outlines are defined in the shared token stylesheet outside Tailwind's base layer so outline-reset utilities cannot hide them.

`apps/admin/e2e/shell.spec.ts` replaces the previous unrecorded browser claim with repeatable desktop/mobile checks and screenshot capture. The tests wait for menu focus movement before sending the next key. Login remains disabled, with no authentication or operational data. Admin metadata is noindex.

This review found no callable shadcn MCP in the active tool inventory. The existing ADR records the original MCP/preset sourcing; that historical tool use cannot be independently replayed here. Existing shadcn primitives were retained and reviewed against the official [sidebar documentation](https://ui.shadcn.com/docs/components/sidebar). No new component registry or provider was installed.

See [current review evidence and screenshots](../EVIDENCE/T1-T2-review.md). The static workspace list remains an explicit T2 placeholder, not evidence of authorization.
