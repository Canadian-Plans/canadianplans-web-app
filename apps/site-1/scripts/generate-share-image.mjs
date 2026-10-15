import { chromium } from '@playwright/test';
/* global document -- Browser evaluation callbacks. */
import { readFile, readdir, stat } from 'node:fs/promises';
// A neutral brand image, with no preview prices, testimonials or customer data.
const name = (await readFile('content/site.ts', 'utf8')).match(/name: '([^']+)'/)[1];
// Latin is the largest of the three preloaded subsets in this pinned font build.
const candidates = await Promise.all(
  (await readdir('.next/static/media'))
    .filter((name) => name.includes('.p.') && name.endsWith('.woff2'))
    .map(async (name) => ({ name, size: (await stat(`.next/static/media/${name}`)).size })),
);
const fontFile = candidates.sort((a, b) => b.size - a.size)[0]?.name;
if (!fontFile) throw new Error('Build the Next font before generating the sharing image.');
const font = (await readFile(`.next/static/media/${fontFile}`)).toString('base64');
const mark = (await readFile('public/design/components/60-13-imgMark.svg')).toString('base64');
const tokens = await readFile('../../packages/ui/src/styles/canadian-plans.css', 'utf8');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent('<html><head></head><body></body></html>');
  await page.addStyleTag({ content: tokens });
  await page.addStyleTag({
    content: `@font-face{font-family:'Google Sans Flex';src:url(data:font/woff2;base64,${font});font-weight:100 1000;font-display:block}html{--font-google-sans-flex:'Google Sans Flex'}body{margin:0}.cp-brand{display:flex;align-items:center;font-weight:700;font-family:var(--cp-font-family)}`,
  });
  await page.evaluate(
    ({ name, mark: markBytes }) => {
      const root = document.createElement('main');
      root.className = 'cp-design cp-share-image';
      const brand = document.createElement('div');
      brand.className = 'cp-brand';
      const mark = document.createElement('img');
      mark.src = `data:image/svg+xml;base64,${markBytes}`;
      mark.alt = '';
      const label = document.createElement('span');
      label.textContent = name;
      brand.append(mark, label);
      root.append(brand);
      document.body.replaceChildren(root);
    },
    { name, mark },
  );
  await page.addStyleTag({
    content:
      '.cp-share-image{height:100vh;display:flex;align-items:center;justify-content:center;background:var(--cp-color-white);color:var(--cp-color-ink)}.cp-share-image .cp-brand{font-size:var(--cp-text-64);gap:var(--cp-space-24)}.cp-share-image .cp-brand span{font-size:var(--cp-text-64)}.cp-share-image img{width:var(--cp-space-64);height:var(--cp-space-64)}',
  });
  await page.locator('img').evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'public/opengraph-image.png' });
} finally {
  await browser.close();
}
