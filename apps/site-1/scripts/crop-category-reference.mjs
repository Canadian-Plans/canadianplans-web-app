import { readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

const [input, output, x, y, width, height] = process.argv.slice(2);
if (!input || !output) throw new Error('Supply source, output and crop bounds.');
const source = PNG.sync.read(await readFile(input));
const bounds = [x, y, width, height].map(Number);
if (bounds.some((value) => !Number.isInteger(value) || value < 0))
  throw new Error('Crop bounds must be non-negative integers.');
const [left, top, cropWidth, cropHeight] = bounds;
if (left + cropWidth > source.width || top + cropHeight > source.height)
  throw new Error('Crop exceeds source bounds.');
const crop = new PNG({ width: cropWidth, height: cropHeight });
PNG.bitblt(source, crop, left, top, cropWidth, cropHeight, 0, 0);
await writeFile(output, PNG.sync.write(crop));
