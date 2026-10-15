# Canadian Plans design tasks

These instructions apply to Figma foundation and page implementation work in
this app. Keep the repository architecture and tenant/security invariants from
[PLATFORM_CONTEXT.md](../../PLATFORM_CONTEXT.md). For a named page, read
[DESIGN_NOTES.md](DESIGN_NOTES.md) before coding.

1. **Scope.** Build only the page named in the prompt. Leave every other page
   implementation unchanged. Modify shared infrastructure only when that page
   needs it; scope styles to that page and report affected shared files. A
   foundation-only task creates no pages.
2. **Figma first.** Call `get_design_context` on both the desktop and mobile
   frame before coding the named page; load the Figma design-to-code skill and
   include its required `skillNames`. Inspect both screenshots. Retrieve visible
   child nodes if a response is sparse. For Home use `60:3` and `195:2` in
   file `6zUS2WZbQn6NUhyjesA584`, Website page `60:2`. For another page, use its
   verified frame pair rather than Home's frames.
3. **Mobile first.** Match the 390 frame, then the 1440 frame. Use fluid layout
   between them, and verify no horizontal document scroll, including narrower
   screens. Keep intended carousels within their own accessible scroll regions.
   Fix overflow at its cause; clipping the document is not verification.
4. **Tokens.** Use the shared Canadian Plans token stylesheet and its `cp-*`
   utilities. Numeric colour/length definitions belong only in that central
   token file: no hardcoded colours or px values in JSX, inline styles or page
   CSS. Add a named token when required by verified Figma context. Percentages,
   intrinsic sizing and calculations from tokens can express fluid geometry.
   Opt new designs into `.cp-design`; keep shared/admin defaults intact.
5. **Rendering.** Server components by default. Introduce client components
   only for browser state, events or forms; keep server-only data/credentials
   outside browser bundles.
6. **Content.** All new page copy, labels, messages, alt text and local plan
   fixtures live in typed files under this app's `/content`, imported through
   `@content/*`. Pass content into components; never embed page copy in JSX.
   Derive offer shapes from existing contracts. Fixtures are marked
   `previewOnly`; real commercial values remain backend-authoritative. Move
   legacy inline copy only when that page is explicitly requested.
7. **Reuse.** Inspect and compose existing `@canadian-plans/ui` primitives and
   app components before adding one. Keep generic primitives in the shared
   package and page compositions in this app. List every new shared component
   in the completion report; say "none" when none were added.
8. **Preview forms.** New forms in design tasks are UI only for now: validate
   client-side, retain input/errors, and submit to a typed stub server action.
   The stub performs no persistence, email or real order operation and reports
   a preview result, never a real order confirmation. Existing integrated
   `/order` and `/track` behavior stays intact unless explicitly tasked to
   change it. Real integration is a separate authorized task with server-side
   validation and the platform's existing contracts.
9. **Completion.** For an implemented page, screenshot it at 390 and 1440,
   compare against the corresponding Figma screenshots, fix every in-scope
   visual/asset mismatch, then report any remaining ambiguity or blocker.
   Verify interaction states, keyboard use, contrast, asset geometry and no
   horizontal scroll. Run checks appropriate to the change. If screenshot
   access is blocked, report it and leave visual verification outstanding.
   Foundation-only work reports tokens and checks, without claiming a page was
   built or screenshot-verified.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
