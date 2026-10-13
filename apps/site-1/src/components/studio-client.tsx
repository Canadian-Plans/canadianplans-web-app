'use client';
import { lazy, Suspense } from 'react';

// A server-side conditional alone still preloads static client dependencies.
// Defer both the editor and its config until the configured editor is rendered.
const StudioEditor = lazy(() => import('./studio-editor'));
export function StudioClient() {
  return (
    <Suspense fallback={null}>
      <StudioEditor />
    </Suspense>
  );
}
