import { Google_Sans_Flex } from 'next/font/google';

export const googleSansFlex = Google_Sans_Flex({
  // Preload the body alphabet; other Unicode subsets load only when used.
  subsets: ['latin'],
  weight: 'variable',
  style: 'normal',
  display: 'swap',
  // Next has no fallback metrics for this family; retain the token's system stack.
  adjustFontFallback: false,
  variable: '--font-google-sans-flex',
  // Figma uses the default grade/roundness/width. Avoid downloading unused axes.
});
