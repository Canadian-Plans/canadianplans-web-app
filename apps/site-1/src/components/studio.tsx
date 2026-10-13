import { studioConfigured } from '../lib/studio-settings';
import { siteConfig } from '../site.config';
import { studioCopy } from '@content/metadata';

export async function Studio() {
  if (studioConfigured) {
    const { StudioClient } = await import('./studio-client');
    return <StudioClient />;
  }
  return (
    <main style={{ padding: 'var(--cp-space-32)', fontFamily: 'var(--cp-studio-font-family)' }}>
      <h1>
        {siteConfig.name} {studioCopy.suffix}
      </h1>
      <p>{studioCopy.pending}</p>
      <p>{studioCopy.unavailable}</p>
      <a href="/">{studioCopy.back}</a>
    </main>
  );
}
