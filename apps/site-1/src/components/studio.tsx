'use client';
import { NextStudio } from 'next-sanity/studio';
import config, { studioConfigured } from '../../sanity.config';

export function Studio() {
  return (
    <NextStudio config={config}>
      {studioConfigured ? undefined : (
        <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
          <h1>Site 1 Studio</h1>
          <p>Sanity project connection is pending T9.</p>
          <p>Content editing is unavailable until the project and editor access are configured.</p>
          <a href="/">Return to storefront</a>
        </main>
      )}
    </NextStudio>
  );
}
