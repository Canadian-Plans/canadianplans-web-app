import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const phase = process.env.AUDIT_PHASE ?? 'working';
const root = resolve('../../docs/EVIDENCE');
const pairs = [
  ...['about', 'contact', 'faq', 'guides', 'guides-index', 'home-internet', 'internet-order'].map(
    (name) => [name, `${name}/figma-desktop.png`, `${name}/figma-mobile.png`],
  ),
  ...['home', 'pre-arrival'].map((name) => [
    name,
    `${name}/figma-1440.png`,
    `${name}/figma-390.png`,
  ]),
  ['mobile-plans', 'mobile-plans/figma-106-65.png', 'mobile-plans/figma-214-2.png'],
  ['pre-arrival-order', 'pre-arrival-order/figma-0.png', 'pre-arrival-order/figma-1.png'],
  ['privacy', 'legal/figma-0.png', 'legal/figma-1.png'],
  ['terms', 'legal/figma-2.png', 'legal/figma-3.png'],
  ['404', 'system/figma-0.png', 'system/figma-1.png'],
  ['search', 'system/figma-2.png', 'system/figma-3.png'],
  ['accessibility', 'system/figma-4.png', 'system/figma-5.png'],
  ['tracking-lookup', 'track-order/figma-0.png', 'track-order/figma-1.png'],
  ['tracking-esim-sent', 'track-order/figma-2.png', 'track-order/figma-3.png'],
  ['tracking-action-needed', 'track-order/figma-4.png', 'track-order/figma-5.png'],
  ['tracking-request-change', 'track-order/figma-6.png', 'track-order/figma-7.png'],
];
const folder = resolve(root, `audit/${phase}/diffs`);
await mkdir(folder, { recursive: true });
const records = [];
for (const [name, desktop, mobile] of pairs)
  for (const width of [390, 1440]) {
    const source = PNG.sync.read(await readFile(resolve(root, width === 390 ? mobile : desktop)));
    const actual = PNG.sync.read(
      await readFile(resolve(root, `audit/${phase}/${name}-${width}.png`)),
    );
    if (source.width !== width || actual.width !== width)
      throw new Error(`Unscaled source required: ${name}`);
    const height = Math.max(source.height, actual.height);
    const pad = (image) => {
      const out = new PNG({ width, height });
      out.data.fill(255);
      PNG.bitblt(image, out, 0, 0, width, image.height, 0, 0);
      return out;
    };
    const a = pad(source),
      b = pad(actual),
      diff = new PNG({ width, height });
    const changed = pixelmatch(a.data, b.data, diff.data, width, height, {
      threshold: 0.2,
      includeAA: false,
    });
    await writeFile(resolve(folder, `${name}-${width}.png`), PNG.sync.write(diff));
    records.push({
      name,
      width,
      source: width === 390 ? mobile : desktop,
      sourceHeight: source.height,
      actualHeight: actual.height,
      heightDelta: actual.height - source.height,
      changedPixels: changed,
      differencePercent: Number(((100 * changed) / (width * height)).toFixed(2)),
      note: 'Raw pixel comparison, no alignment or masking. Typography, draft warnings and changed state can dominate the result; inspect the diff.',
    });
    console.info(name, width, records.at(-1).differencePercent, records.at(-1).heightDelta);
  }
// Email references describe the 600px body inside its 680px canvas, not the preview UI.
for (const [index, template] of ['order-received', 'esim-ready', 'install-booked'].entries()) {
  const source = PNG.sync.read(await readFile(resolve(root, `emails/figma-${index}.png`)));
  const actual = PNG.sync.read(await readFile(resolve(root, `emails/${template}-1440.png`)));
  if (source.width !== actual.width || source.height !== actual.height)
    throw new Error(`Email canvas size mismatch: ${template}`);
  const diff = new PNG({ width: source.width, height: source.height });
  const changed = pixelmatch(source.data, actual.data, diff.data, source.width, source.height, {
    threshold: 0.2,
    includeAA: false,
  });
  await writeFile(resolve(folder, `email-${template}-body.png`), PNG.sync.write(diff));
  records.push({
    name: `email-${['order', 'esim', 'install'][index]}`,
    width: 1440,
    canvasWidth: source.width,
    source: `emails/figma-${index}.png`,
    sourceHeight: source.height,
    actualHeight: actual.height,
    heightDelta: 0,
    changedPixels: changed,
    differencePercent: Number(((100 * changed) / (source.width * source.height)).toFixed(2)),
    note: 'Unscaled standalone email body, excluding the application preview toolbar.',
  });
}
await writeFile(resolve(folder, 'summary.json'), JSON.stringify(records, null, 2));
