# Canadian Plans

T1–T3 provide the monorepo, backend/admin shell and site-1 scaffold. T4 adds the first Drizzle workspace/access schema, restricted runtime role, tenant RLS and pooled transaction helper. Authentication and operational order data remain later tasks; this is not yet a production-ready platform.

## Read the project context

Start with [PLATFORM_CONTEXT.md](PLATFORM_CONTEXT.md), then [Build Tasks](docs/BUILD_TASKS.md). The canonical detailed planning files currently live under `docs/`; root forwarding files preserve the paths in existing task prompts without duplicating their contents.

- [Requirements](docs/REQUIREMENTS.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [Owner Playbook](docs/OWNER_PLAYBOOK.md)
- [Business inputs and confirmed decisions](docs/OPEN_INPUTS.md)
- [Admin workspace placeholder note](OPEN_INPUTS.md)
- [Reviewed baseline](docs/ADR/0000-reviewed-planning-baseline.md)

Both existing OPEN_INPUTS files and ADR 0000 are preserved. Use the detailed business register under `docs/` for real business decisions.

## AI sessions

[AGENTS.md](AGENTS.md) is the shared startup entry point. It requires the platform
context and [project workflow skill](.agents/skills/project-workflow/SKILL.md), then
only task-relevant documents. CLAUDE.md points to the same instructions.

For an AI tool that does not load AGENTS.md automatically, start with:

> Read AGENTS.md and follow its startup reading order. My task is: …

The AI needs repository access to read these files. Keep workflow changes in the
shared guide instead of maintaining separate copies for each model.

## Local development

Use Node **22.19.0** and pnpm **9.15.0**. Dependency versions are pinned in manifests, the pnpm catalog and lockfile.

```sh
pnpm install --frozen-lockfile
pnpm --filter backend dev
pnpm --filter admin dev
```

The backend listens on port 4000; admin defaults to 3000. The health endpoint and frontend scaffolds need no credentials. Database-backed work uses the two connection variables documented in [docs/ENV.md](docs/ENV.md). The admin starts at `/login`; inspect the shell at `/w/site-1/orders`.

## Verification

```sh
pnpm run typecheck
pnpm run lint
pnpm run format
pnpm run test:tooling
pnpm run test
pnpm run build
pnpm --filter admin exec playwright install chromium
pnpm run test:e2e
```

Playwright starts the production admin build on port 3100. Set `CAPTURE_SCREENSHOTS=1` when running it to refresh the seven desktop and seven mobile screenshots under `docs/EVIDENCE/T2-screenshots`.

`pnpm run build:affected` selects applications through workspace dependencies using `BASE_SHA`; without a valid baseline it builds all applications. Vercel uses the same selector with `VERCEL_GIT_PREVIOUS_SHA`, anchored to the repository root. CI never deploys; the owner selects production releases.

See [T1/T2 review evidence](docs/EVIDENCE/T1-T2-review.md) for findings, fixes, test output and screenshot links.

T3 adds the [site-1 scaffold](apps/site-1/README.md), served locally on port 3001.
Its security suite runs production builds and browser tests with analytics enabled
and disabled, including a synthetic-credential bundle scan. The root `test:e2e`
command includes this suite after admin. Sanity project connection remains T9;
sites 2 and 3 remain Phase B.
