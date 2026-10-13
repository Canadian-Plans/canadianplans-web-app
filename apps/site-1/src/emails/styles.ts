import type { CSSProperties } from 'react';
import { emailTokens as t } from './tokens.generated';
export const px = (length: number) => `${length}px`;
export function emailText(
  size: number,
  line: number,
  color: string = t.ink,
  weight: number = t.regular,
): CSSProperties {
  return {
    fontFamily: t.fontFamily,
    fontSize: size,
    lineHeight: px(line),
    fontWeight: weight,
    margin: t.zero,
    color,
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  };
}
export const emailStyles = {
  body: {
    margin: t.zero,
    padding: t.zero,
    backgroundColor: t.snow,
    fontFamily: t.fontFamily,
    fontVariationSettings: t.fontVariations,
    color: t.ink,
  } satisfies CSSProperties,
  outer: {
    width: '100%',
    maxWidth: t.frameWidth,
    margin: 'auto',
    borderSpacing: t.zero,
  } satisfies CSSProperties,
  wrapper: { padding: `${px(t.s32)} ${px(t.s40)}` } satisfies CSSProperties,
  card: {
    width: '100%',
    maxWidth: t.width,
    backgroundColor: t.white,
    borderRadius: t.r16,
    borderSpacing: t.zero,
    overflow: 'hidden',
  } satisfies CSSProperties,
  header: {
    padding: `${px(t.s20)} ${px(t.s32)}`,
    backgroundColor: t.ink,
    borderRadius: `${px(t.r16)} ${px(t.r16)} ${px(t.zero)} ${px(t.zero)}`,
  } satisfies CSSProperties,
  content: { padding: `${px(t.s36)} ${px(t.s32)} ${px(t.s32)}` } satisfies CSSProperties,
  image: {
    height: t.imageHeight,
    width: '100%',
    backgroundColor: t.imageFallback,
    backgroundImage: t.imageBackground,
    border: `${px(t.imageStroke)} dashed ${t.imageBorder}`,
    borderRadius: t.r20,
    boxSizing: 'border-box',
  } satisfies CSSProperties,
  imageCell: { padding: t.s24, textAlign: 'center' } satisfies CSSProperties,
  steps: { width: '100%', backgroundColor: t.snow, borderRadius: t.r14 } satisfies CSSProperties,
  boxCell: { padding: t.s20 } satisfies CSSProperties,
  number: {
    width: t.s28,
    height: t.s28,
    backgroundColor: t.blue,
    borderRadius: t.r14,
    textAlign: 'center',
  } satisfies CSSProperties,
  button: {
    ...emailText(t.t18, t.line23, t.white, t.semibold),
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: `${px(t.s18)} ${px(t.s28)}`,
    borderRadius: t.pill,
    backgroundColor: t.blue,
    textDecoration: 'none',
    textAlign: 'center',
  } satisfies CSSProperties,
  summary: {
    width: '100%',
    border: `${px(t.border)} solid ${t.line}`,
    borderRadius: t.r14,
    tableLayout: 'fixed',
  } satisfies CSSProperties,
  footer: {
    padding: `${px(t.s20)} ${px(t.s32)} ${px(t.s24)}`,
    backgroundColor: t.snow,
    borderRadius: `${px(t.zero)} ${px(t.zero)} ${px(t.r16)} ${px(t.r16)}`,
  } satisfies CSSProperties,
} as const;
