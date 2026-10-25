# Approved guide covers — 24 October 2026

Added the six owner-approved branded cover-v2 images to their matching guide index
cards and the student-from-India article. Related-guide cards use the same registry.
Guides added after image generation retain their existing placeholders.

The owner-approved photographic covers supersede the image placeholders for these
six guides. Covers display at their full aspect ratio, preserving the top-left logo,
bottom-left title and subject separation. No shared UI components were added.

## Verification

- Site-1 TypeScript check and targeted ESLint passed.
- Existing guide resolution, schema and filter tests: 2 files, 9 tests passed.
- Prettier check passed for the changed source files.
- Site-1 production build passed, generating all 49 pages. The existing Google Sans
  Flex fallback-font warning remains.
- Playwright checked `/guides` and `/guides/best-sim-for-students-from-india` at
  390 and 1440 pixels. All six index covers decoded after expanding the list;
  the article cover decoded at each width. Visible image ratios matched their
  natural ratios, with no page errors or horizontal document overflow.
- `index-390.png`, `index-1440.png`, `article-390.png`, `article-1440.png` record
  browser rendering. The index captures include all guides after expanding the list.

These checks verify the approved assets and their integration, not a renewed
comparison of the page layout against Figma. Existing unrelated placeholders remain.

## Approved second batch — 24 October 2026

Connected ten additional owner-approved covers through `content/guide-covers.ts`,
using stable `*-cover-approved.png` filenames. The site now has sixteen guide covers.
Selections include the landscape internet-cost cover with the larger semibold title,
the candid pre-departure-at-home photo, the carrier comparison with sample plan cards,
and the original closer family composition for new immigrants. Draft variants remain
unreferenced. The visitors/Super Visa cover has not yet been generated.

Validation: TypeScript, targeted ESLint, and the existing guide tests passed
(2 files, 12 tests). Playwright using installed Chrome checked the expanded `/guides`
index and the internet-cost and carrier-comparison articles at 390 and 1440 pixels.
All sixteen index covers loaded, visible images retained their natural aspect ratios,
and there were no page errors or horizontal overflow. Screenshots are in
`approved-batch/`. No shared components were added or modified for this batch.
