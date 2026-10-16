import { chromium } from '@playwright/test';
/* global document, getComputedStyle, innerWidth, scrollY -- Browser evaluation callbacks. */
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertAuditRecords } from './audit-records.mjs';

export const routes = [
  ['home', '/'],
  ['pre-arrival', '/pre-arrival-sim'],
  ['home-internet', '/home-internet'],
  ['mobile-plans', '/mobile-plans'],
  ['business-internet', '/business-internet'],
  ['sim-students', '/pre-arrival-sim/students'],
  ['sim-india', '/pre-arrival-sim/from-india'],
  ['sim-airport', '/pre-arrival-sim/toronto-pearson'],
  ['mobile-rogers', '/mobile-plans/rogers'],
  ['compare-rogers-fido', '/compare/rogers-vs-fido'],
  ['internet-vancouver', '/home-internet/vancouver'],
  ['internet-ontario', '/home-internet/ontario'],
  ['contact', '/contact'],
  ['faq', '/faq'],
  ['about', '/about'],
  ['guides-index', '/guides'],
  ['guides', '/guides/best-sim-for-students-from-india'],
  ['internet-order', '/order/home-internet'],
  ['pre-arrival-order', '/order/pre-arrival'],
  ['privacy', '/privacy'],
  ['terms', '/terms'],
  ['search', '/search'],
  ['accessibility', '/accessibility'],
  ['404', '/missing-preview-page'],
  ['components', '/dev/components'],
  ['email-order', '/dev/emails?template=order-received'],
  ['email-esim', '/dev/emails?template=esim-ready'],
  ['email-install', '/dev/emails?template=install-booked'],
  ...[
    'lookup',
    'esim-sent',
    'action-needed',
    'request-change',
    'not-found',
    'too-many-tries',
    'code-expired',
  ].map((s) => [`tracking-${s}`, `/track-order?state=${s}`]),
  ['legacy-plans', '/plans'],
  ['legacy-plan', '/plans/test-plan'],
  ['legacy-order', '/order'],
  ['legacy-track', '/track'],
  ['studio', '/studio'],
];

if (process.argv[1]?.endsWith('audit-pages.mjs')) {
  const origin = process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
  const phase = process.env.AUDIT_PHASE ?? 'baseline';
  const filter = process.env.AUDIT_ROUTES?.split(',');
  const selected = routes.filter(([name]) => !filter || filter.includes(name));
  if (!selected.length || filter?.some((name) => !routes.some(([route]) => route === name)))
    throw new Error('AUDIT_ROUTES contains an unknown route name.');
  const folder = resolve(`../../docs/EVIDENCE/audit/${phase}`);
  await mkdir(folder, { recursive: true });
  const browser = await chromium.launch();
  let records = [];
  if (filter) {
    try {
      records = JSON.parse(await readFile(resolve(folder, 'pages.json'), 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  try {
    for (const width of [390, 1440]) {
      for (const [name, path] of selected) {
        const context = await browser.newContext({
          viewport: { width, height: width === 390 ? 844 : 900 },
        });
        await context.addInitScript(() =>
          localStorage.setItem(
            'canadian-plans.cookie-choices.v1',
            JSON.stringify({ version: 1, analytics: false, marketing: false }),
          ),
        );
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        const record = { name, path, width, errors };
        try {
          const response = await page.goto(origin + path, {
            timeout: 60000,
            waitUntil: 'networkidle',
          });
          record.status = response.status();
          await page.evaluate(() => document.fonts.ready);
          await page.locator('img').evaluateAll((images) =>
            Promise.all(
              images
                .filter((img) => img.getBoundingClientRect().width)
                .map((img) => {
                  img.loading = 'eager'; // Visual QA includes images below the fold.
                  return img.decode().catch(() => {});
                }),
            ),
          );
          await page.addStyleTag({ content: 'nextjs-portal{visibility:hidden;}' });
          await page.screenshot({ path: resolve(folder, `${name}-${width}.png`), fullPage: true });
          Object.assign(
            record,
            await page.evaluate(() => {
              const visible = (n) =>
                n.getBoundingClientRect().width > 0 &&
                n.getBoundingClientRect().height > 0 &&
                getComputedStyle(n).visibility !== 'hidden';
              const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
                .filter(visible)
                .map((n) => ({ level: Number(n.tagName[1]), text: n.textContent.trim() }));
              const jumps = headings.filter((h, i) => i && h.level > headings[i - 1].level + 1);
              return {
                headings,
                headingJumps: jumps,
                brokenAnchors: [...document.querySelectorAll('a[href^="#"]')]
                  .filter(
                    (link) =>
                      visible(link) &&
                      link.hash.length > 1 &&
                      !document.getElementById(decodeURIComponent(link.hash.slice(1))),
                  )
                  .map((link) => ({
                    href: link.getAttribute('href'),
                    text: link.textContent.trim(),
                  })),
                h1Count: headings.filter((h) => h.level === 1).length,
                overflow: document.documentElement.scrollWidth > innerWidth,
                images: [...document.images].filter(visible).map((n) => ({
                  src: n.getAttribute('src'),
                  next: n.hasAttribute('data-nimg'),
                  loaded: n.naturalWidth > 0,
                  alt: n.getAttribute('alt'),
                })),
                title: document.title,
                description: document.querySelector('meta[name="description"]')?.content,
                og: Object.fromEntries(
                  [...document.querySelectorAll('meta[property^="og:"]')].map((n) => [
                    n.getAttribute('property'),
                    n.content,
                  ]),
                ),
                canonical: document.querySelector('link[rel="canonical"]')?.href,
                robots: document.querySelector('meta[name="robots"]')?.content,
                landmarks: [...document.querySelectorAll('main,header,footer,section')]
                  .filter(visible)
                  .map((n) => {
                    const r = n.getBoundingClientRect();
                    return { class: n.className, y: r.y + scrollY, height: r.height };
                  }),
              };
            }),
          );
          const axe = await new AxeBuilder({ page })
            .exclude('iframe')
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'])
            .analyze();
          record.violations = axe.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
          }));
          await page.keyboard.press('Control+Home');
          await page.evaluate(() => document.activeElement?.blur());
          const focus = [];
          for (let i = 0; i < 12; i++) {
            await page.keyboard.press('Tab');
            focus.push(
              await page.evaluate(() => {
                const n = document.activeElement,
                  s = getComputedStyle(n);
                return {
                  tag: n.tagName,
                  text: (n.textContent || n.getAttribute('aria-label') || '').trim().slice(0, 80),
                  outline: s.outlineStyle,
                  outlineWidth: s.outlineWidth,
                  shadow: s.boxShadow,
                };
              }),
            );
          }
          record.keyboardFocus = focus;
        } catch (e) {
          record.failure = e.message;
        }
        records = records.filter((prior) => prior.name !== name || prior.width !== width);
        records.push(record);
        await writeFile(resolve(folder, 'pages.json'), JSON.stringify(records, null, 2));
        console.info(
          name,
          width,
          record.status,
          'axe',
          record.violations?.length,
          'overflow',
          record.overflow,
          record.failure ?? '',
        );
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  assertAuditRecords(records.filter((record) => selected.some(([name]) => name === record.name)));
}
