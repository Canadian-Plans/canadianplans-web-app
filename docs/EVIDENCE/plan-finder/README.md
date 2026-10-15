# Global plan finder evidence

Read Figma note `285:8` first in file `6zUS2WZbQn6NUhyjesA584`, Website `60:2`.
Its scope is a global Nav modal with A/B branches and a shared result, not a
page-specific finder. All sixteen requested frames returned full design context,
screenshots and metadata before implementation.

| State | Desktop | Mobile |
| --- | --- | --- |
| Location | [rendered](location-1440.png) / [291:3](figma-291-3.png) | [rendered](location-390.png) / [305:2](figma-305-2.png) |
| A1 Need | [rendered](need-1440.png) / [291:62](figma-291-62.png) | [rendered](need-390.png) / [305:64](figma-305-64.png) |
| A2 Province | [rendered](province-1440.png) / [291:109](figma-291-109.png) | [rendered](province-390.png) / [305:114](figma-305-114.png) |
| A3 Provider | [rendered](provider-1440.png) / [292:3](figma-292-3.png) | [rendered](provider-390.png) / [305:201](figma-305-201.png) |
| A4 Priority | [rendered](priority-1440.png) / [292:91](figma-292-91.png) | [rendered](priority-390.png) / [305:292](figma-305-292.png) |
| B1 Arrival | [rendered](arrival-kind-1440.png) / [292:145](figma-292-145.png) | [rendered](arrival-kind-390.png) / [305:349](figma-305-349.png) |
| B2 Stay | [rendered](stay-1440.png) / [293:3](figma-293-3.png) | [rendered](stay-390.png) / [305:419](figma-305-419.png) |
| Result | [rendered](result-1440.png) / [293:73](figma-293-73.png) | [rendered](result-390.png) / [305:492](figma-305-492.png) |

[Verification results](verification.json) include rendered geometry, SVG root
and visible dimensions, WCAG AA audits and user flows. All sixteen views have
zero axe violations. Both paths, Back, Edit, downstream-answer clearing, native
radio arrow keys, details/selection previews, scrolling to the last provider,
Escape, focus restoration and fresh reopen pass. Modal bounds and document
overflow are checked at 320/390/768/1024/1280/1440. No page errors occurred.

Run `node apps/site-1/scripts/verify-plan-finder.mjs` with the local dev server
at `http://127.0.0.1:3127`, or set `FINDER_TEST_URL`. Global Nav entrypoints were
verified on Home, pre-arrival SIM, home internet, mobile plans, the component lab
and the existing `/plans` route. Only shared navigation/root integration was
changed; no unrelated page design or integrated order/track behavior was edited.

Seventy-two original SVG exports are local under `public/design/plan-finder`.
Metadata/hash inspection confirmed exact duplicate desktop/mobile exports.
Mobile priority, arrival and result sparkle icons have distinct native sizes
and use separate exports. No SVG paths or screenshots were converted into code.

The typed step configuration and preview datasets live in
`apps/site-1/content/plan-finder.ts`; `src/lib/plan-finder-flow.ts` contains pure
transition/history logic. A uses four questions, B uses two, and both converge
on results. Defaults reproduce Figma's selected examples. Changing an answer
clears downstream values; Back preserves them; unchanged Edit choices survive.

All results are preview fixtures. Source B prices are Rogers 100 GB/$40 and
Fido 75 GB/$35. A uses existing typed mobile/internet samples and explicit
priority rankings. Province/provider/audience/stay commercial eligibility is
not inferred without an approved matrix. Internet follows the supplied A path.
Details, selection and advisor actions create no lead, order, payment, number
transfer, booking, activation or message. Backend-authoritative matching and
approved claims remain future integration work.

Visual corrections: centering/translation reset, native option icon sizes,
desktop inline badges, mobile source text breaks, compact rows, sheet scroll and
close controls. Intentional adaptations: darker green badge text, dark orange
badge text for AA, visible result preview notice, and the real page behind the
scrim. Small font/line-box rounding differences remain. The existing Google Sans
Flex fallback-metrics warning remains.

Validation: site TypeScript, ESLint, Prettier, 87 unit tests (10 new flow tests),
shared UI TypeScript and 25 tests, optimized Next build using synthetic preview
configuration. Database-backed order E2E was not rerun for this nonmutating
widget; local Postgres was unavailable in earlier session checks.

New shared app components: PlanFinderProvider, PlanFinderModal and
PlanFinderTrigger; shared hook: usePlanFinder. Existing UI package primitives
are reused, with additive central tokens and finder-only styles.
