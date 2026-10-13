'use client';
import { useEffect, useRef, useState } from 'react';
import { emailPreviewCopy } from '@content/emails';
export function EmailPreviewFrame({ html }: { html: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number>();
  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;
    let observer: ResizeObserver | undefined;
    let cancelled = false;
    async function connect() {
      await globalThis.document.fonts.ready;
      const document = iframe?.contentDocument;
      if (!document || cancelled) return;
      // Preview-only font transfer; exported emails use inline styles and a safe fallback.
      const fontRules: string[] = [];
      for (const stylesheet of globalThis.document.styleSheets) {
        let rules: CSSRuleList;
        try {
          rules = stylesheet.cssRules;
        } catch {
          continue;
        }
        for (const rule of rules) {
          if (
            !(rule instanceof CSSFontFaceRule) ||
            !rule.style.fontFamily.includes('Google Sans Flex')
          )
            continue;
          fontRules.push(
            rule.cssText.replace(
              /url\(["']?([^"')]+)["']?\)/gu,
              (_match, path: string) =>
                `url("${new URL(path, stylesheet.href ?? globalThis.location.href).href}")`,
            ),
          );
        }
      }
      const fonts = document.createElement('style');
      fonts.textContent = fontRules.join('\n');
      document.head.appendChild(fonts);
      observer?.disconnect();
      observer = new ResizeObserver(() => {
        if (!cancelled) setHeight(document.body.getBoundingClientRect().height);
      });
      observer.observe(document.body);
      await document.fonts.ready;
      if (!cancelled) {
        setHeight(document.body.getBoundingClientRect().height);
        iframe?.setAttribute('data-preview-ready', 'true');
      }
    }
    const onLoad = () => void connect();
    iframe.addEventListener('load', onLoad);
    if (iframe.contentDocument?.readyState === 'complete') void connect();
    return () => {
      cancelled = true;
      observer?.disconnect();
      iframe.removeEventListener('load', onLoad);
    };
  }, [html]);
  // Trusted server-rendered fixtures only. Scripts and top-level navigation remain sandboxed.
  return (
    <iframe
      ref={frame}
      title={emailPreviewCopy.frameTitle}
      srcDoc={html}
      sandbox="allow-same-origin"
      style={{ height }}
      className="cp-email-preview-frame"
    />
  );
}
