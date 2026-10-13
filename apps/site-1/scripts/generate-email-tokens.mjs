import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { resolveEmailTokens } from './email-token-source.mjs';
const tokens = resolveEmailTokens(
  await readFile(resolve('../../packages/ui/src/styles/canadian-plans.css'), 'utf8'),
);
await mkdir('src/emails', { recursive: true });
await writeFile(
  'src/emails/tokens.generated.ts',
  `// Generated from the central Canadian Plans CSS tokens. Run pnpm emails:tokens.\n// Email clients receive literal pixel/color values, never CSS custom properties.\nexport const emailTokens = ${JSON.stringify(tokens, null, 2)} as const;\n`,
);
