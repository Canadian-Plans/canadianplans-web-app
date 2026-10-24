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
