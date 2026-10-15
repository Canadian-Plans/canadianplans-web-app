# Contact design verification

Sources: Figma `6zUS2WZbQn6NUhyjesA584`, desktop `122:3`, mobile `220:70`.
The implementation is an isolated `/contact` design preview.

## Visual evidence

| View | Figma | Browser |
| --- | --- | --- |
| 390 | [Source](figma-mobile.png) | [Page](contact-390.png), [form and help](message-390.png) |
| 1440 | [Source](figma-desktop.png) | [Page](contact-1440.png), [form and help](message-1440.png) |

Validation, preview results and contact-dialog captures are saved alongside
these images. Main section positions and dimensions match the source: mobile
Hero 164/335, options 499/752, tracking/office 1251/1212, message/help 2463/1365;
desktop Hero 160/318, options 478/339, tracking/office 817/628, message/help
1445/745. Values are top/height in CSS pixels. Full-page output is 390×4775 and
1440×2629. Minor browser font-glyph and dashed-border rasterization differences
remain; the source office photo is still a placeholder.

## Verification

With site-1 running at `http://127.0.0.1:3127`, run from the repository root:

```powershell
node apps/site-1/scripts/verify-contact.mjs
```

The script verifies:

- Both frames, loaded static assets, source SVG SHA-256 hashes and intrinsic
  rendered sizes. Shared logo, footer logo, search, chat, menu and image-slot
  assets are exact matches; the phone and trust exports are local contact assets.
- No WCAG A/AA scan violations on the page or contact dialogs, no page errors,
  keyboard topic selection, dialog Escape and restored trigger focus.
- Required inputs, optional phone validation, retained drafts, honest message
  and tracking results, quick-help topic shortcuts and the global Nav finder.
- Delayed form transport, disabled pending controls, duplicate protection,
  failed transport and retry through the real stub action with the same draft.
- No horizontal document scroll at 320, 390, 768, 1024, 1280 and 1440. Inputs
  do not appear in navigation URLs.

Detailed results are in [verification.json](verification.json). Unit tests cover
field limits, phone parsing, topics, tracking validation and direct malformed
server requests; the stub never reflects personal data in its return value.

Contact details and office hours are unapproved design fixtures. WhatsApp,
calling and directions explain that status instead of opening a live service;
email focuses the local message form. No email, chat, lead, order, tracking
lookup or installation request is created.
