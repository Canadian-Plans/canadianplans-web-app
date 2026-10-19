/* global document */
/**
 * Electric Blue landing pages (15 October 2026). For each route at 320/390/1440:
 * one h1, no horizontal document scroll, every in-page anchor resolves, valid JSON-LD
 * (BreadcrumbList, FAQPage with only approved answers), no serious/critical axe findings,
 * no page errors. Saves 390/1440 full-page screenshots as evidence.
 *
 *   AUDIT_ORIGIN=http://127.0.0.1:3001 node scripts/verify-landing.mjs [route ...]
 */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installAuditContext } from './audit-context.mjs';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const evidence = path.resolve(appRoot, '../../docs/EVIDENCE/landing');
const origin = process.env.AUDIT_ORIGIN ?? 'http://127.0.0.1:3127';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/pre-arrival-sim/students'];

await mkdir(evidence, { recursive: true });
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const failures = [];
try {
  for (const route of routes) {
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
      });
      await installAuditContext(context);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const label = `${route} @${width}`;
      try {
        assert.equal(
          (await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' }))?.status(),
          200,
        );
        await page.evaluate(() => document.fonts.ready);
        const report = await page.evaluate(() => {
          const ids = new Set([...document.querySelectorAll('[id]')].map((node) => node.id));
          const broken = [...document.querySelectorAll('a[href^="#"]')]
            .map((link) => link.getAttribute('href')?.slice(1) ?? '')
            .filter((id) => id && !ids.has(id));
          const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(
            (node) => JSON.parse(node.textContent ?? '{}'),
          );
          return {
            h1: document.querySelectorAll('h1').length,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            broken: [...new Set(broken)],
            ld,
          };
        });
        assert.equal(report.h1, 1, `${label}: expected one h1`);
        assert.ok(report.overflow <= 0, `${label}: horizontal scroll ${report.overflow}px`);
        assert.deepEqual(report.broken, [], `${label}: anchors without targets`);
        const graph = report.ld.flatMap((schema) => schema['@graph'] ?? [schema]);
        assert.ok(
          graph.some((node) => node['@type'] === 'BreadcrumbList'),
          `${label}: BreadcrumbList JSON-LD missing`,
        );
        const answers = graph
          .filter((node) => node['@type'] === 'FAQPage')
          .flatMap((node) => node.mainEntity.map((q) => q.acceptedAnswer.text));
        assert.ok(
          answers.every((text) => !/awaiting approved content/iu.test(text)),
          `${label}: pending FAQ answer in JSON-LD`,
        );
        if (width !== 320) {
          const axe = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
          const blocking = axe.violations
            .filter((v) => v.impact === 'serious' || v.impact === 'critical')
            .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
          assert.deepEqual(blocking, [], `${label}: axe serious/critical`);
          await page.screenshot({
            path: path.join(
              evidence,
              `${route.replace(/\W+/gu, '-').replace(/^-/u, '')}-${width}.png`,
            ),
            fullPage: true,
          });
        }
        assert.deepEqual(errors, [], `${label}: page errors`);
        console.info(`ok   ${label}`);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
        console.info(`FAIL ${label}`);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
