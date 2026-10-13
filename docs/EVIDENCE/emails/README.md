# Transactional email templates

Figma file `6zUS2WZbQn6NUhyjesA584`: Order received `309:3`, eSIM ready `309:53`,
Install booked `309:102`. Full design context, metadata and screenshots were read.
`figma-0/1/2.png` are the original 680-wide design frames, including inbox labels.

Preview: `http://127.0.0.1:3127/dev/emails`, with `?template=order-received`,
`esim-ready` or `install-booked`. It is noindex and follows the existing component
lab's development/Vercel-preview availability; production returns 404.

The templates use React Email 6.11.1. Main layout is presentation tables; all
delivered styles are inline literal values compiled from the central CSS tokens.
There are no stylesheets, classes, custom properties, temporary Figma URLs or
scripts in exported HTML. The 600-wide body is bounded by the viewport; the
680-wide outer frame uses the source's 40 horizontal / 32 vertical padding.

Measured desktop bodies match the source: Order received 600×1186, eSIM ready
600×1142, Install booked 600×1164. Header is 68, image slot 536×170, footer 164;
step boxes are 225/218/183 and summaries 185/155/185. Screenshots include all
three previews at 390/1440 viewport widths; 320 overflow is also checked.

Browser-only font-face CSS is copied into the sandboxed preview from the site's
loaded Next font stylesheet to compare Google Sans Flex with Figma. This CSS is
absent from delivered HTML, which specifies Arial/sans-serif fallbacks. Raw HTML
and plain-text output are available in the preview's disclosure panels.

The source image-slot icon exactly matches the existing
`/design/components/312-2-imgIcon.svg`: SHA-256
`718635e95fdab861db5514a5d74c633d8b7723e26e8f046f3974fe6ffa51d55b`, 32×32 root
and rendered dimensions. Downloaded duplicates were removed without changing SVG
paths/shapes. The blue 28×28 header rectangle is the actual source mark; no star
asset is substituted. Photography remains the explicit Figma placeholders.

Run from `apps/site-1`:

```powershell
pnpm emails:tokens
pnpm emails:verify
pnpm test
```

`verification.json` records layout, asset geometry, overflow and axe WCAG A/AA
results. Both the preview controls and standalone exported HTML are checked;
iframe script restrictions are retained. The verifier confirms generated tokens
match the central stylesheet, all formats are available, and unknown templates
are handled safely. `*.html` and `*.txt` are fictional fixture exports.

Rendering tests cover all three variants, personalization, hidden preheaders,
preview-only inbox annotations, escaped HTML-like values, blocked header control
characters/unsafe URLs, sanitized errors and template-name prototype keys.
Delivery is not connected to a provider or backend outbox. Real callers supply
authoritative order/plan values, valid asset origins and protected action URLs.

Site-1 lint, TypeScript, scoped Prettier, all 153 tests and production/preview
builds passed. Build verification used test-only backend configuration and no
live service credentials. The original Next declaration file was preserved.

Remaining review: native Gmail/Outlook/Apple Mail inbox rendering, SVG-image
support (replace the placeholder with approved raster photography), webfont/
gradient/corner fallbacks, and source business claims: two-hour response time,
activation timing, prices/free install, rescheduling window and contact details.
Browser layout checks are not claims of universal email-client parity. Minor font
glyph/dashed-border differences remain, and the existing Next font-fallback
metrics warning remains.
