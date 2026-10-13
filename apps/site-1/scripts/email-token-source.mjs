import postcss from 'postcss';
export const tokenNames = {
  zero: '--cp-cookie-origin',
  captionLeading: '--cp-leading-caption',
  labelLeading: '--cp-leading-label',
  imageTracking: '--cp-tracking-eyebrow',
  width: '--cp-email-body-width',
  frameWidth: '--cp-email-frame-width',
  imageHeight: '--cp-email-image-height',
  titleLine: '--cp-email-title-line',
  bodyLine: '--cp-email-body-line',
  fontFamily: '--cp-email-font-family',
  fontVariations: '--cp-email-font-variations',
  logoRadius: '--cp-email-logo-radius',
  ink: '--cp-color-ink',
  blue: '--cp-color-blue',
  white: '--cp-color-white',
  snow: '--cp-color-illustration-snow',
  muted: '--cp-color-slot-muted',
  bodyInk: '--cp-system-body',
  line: '--cp-system-line',
  imageBorder: '--cp-color-slot-border',
  imageBackground: '--cp-gradient-slot',
  imageFallback: '--cp-color-slot-gradient-start',
  regular: '--cp-weight-regular',
  bold: '--cp-weight-bold',
  semibold: '--cp-mobile-weight-semibold',
  pill: '--cp-radius-999',
  r14: '--cp-radius-14',
  r16: '--cp-radius-16',
  r20: '--cp-radius-20',
  border: '--cp-border-thin',
  imageStroke: '--cp-border-outline',
  line19: '--cp-cookie-copy-line',
  line23: '--cp-cookie-title-line',
  line21: '--cp-system-line-21',
  line25: '--cp-guide-line-25',
  ...Object.fromEntries(
    [2, 6, 8, 10, 12, 16, 18, 20, 24, 28, 32, 36, 40].map((value) => [
      's' + value,
      '--cp-space-' + value,
    ]),
  ),
  ...Object.fromEntries(
    [12, 13, 14, 15, 16, 17, 18, 20, 30].map((value) => ['t' + value, '--cp-text-' + value]),
  ),
};
export function resolveEmailTokens(css) {
  const definitions = new Map();
  postcss.parse(css).walkDecls((declaration) => {
    if (declaration.prop.startsWith('--cp-')) definitions.set(declaration.prop, declaration.value);
  });
  const resolve = (name, trail = []) => {
    if (trail.includes(name) || !definitions.has(name))
      throw new Error('Invalid email token reference');
    return definitions
      .get(name)
      .replace(/var\((--cp-[\w-]+)\)/gu, (_, dependency) => resolve(dependency, [...trail, name]));
  };
  return Object.fromEntries(
    Object.entries(tokenNames).map(([key, name]) => {
      const value = resolve(name)
        .replace(/(-?[\d.]+)rem\b/gu, (_, number) => `${Number(number) * 16}px`)
        .replace(/\s+/gu, ' ')
        .replace(/rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/gu, 'rgba($1, $2, $3, $4)');
      return [key, /^-?[\d.]+(?:px)?$/u.test(value) ? Number(value.replace('px', '')) : value];
    }),
  );
}
