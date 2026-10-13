import { useEffect } from 'react';
import type { ComponentProps } from 'react';
declare global {
  interface Window {
    analyticsEvents?: unknown[][];
  }
}
/** Only the external Next Script lifecycle is substituted. The consent provider and Analytics are real. */
export default function Script({
  onReady,
  strategy: _strategy,
  ...props
}: ComponentProps<'script'> & { onReady?: () => void; strategy?: string }) {
  useEffect(() => {
    Object.assign(globalThis, {
      umami: {
        track: (...args: unknown[]) => {
          const events = window.analyticsEvents ?? [];
          events.push(args);
          Object.assign(globalThis, { analyticsEvents: events });
        },
      },
    });
    onReady?.();
  }, [onReady]);
  return <script {...props} src={undefined} data-fixture-src={props.src} />;
}
