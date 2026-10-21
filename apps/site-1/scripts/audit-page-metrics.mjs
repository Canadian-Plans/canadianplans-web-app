/* global document, getComputedStyle, innerWidth, scrollY -- Browser evaluation. */

/** Passed directly to Playwright so collection and validation share one record contract. */
export function collectPageMetrics() {
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
    figmaAssets: [...document.querySelectorAll('img[data-figma-asset]')]
      .filter(visible)
      .map((image) => ({
        width: image.getBoundingClientRect().width,
        height: image.getBoundingClientRect().height,
        expectedWidth: Number(image.getAttribute('width')),
        expectedHeight: Number(image.getAttribute('height')),
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
}
