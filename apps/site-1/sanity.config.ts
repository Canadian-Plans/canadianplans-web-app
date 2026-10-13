'use client';
import { schemaTypes } from '@canadian-plans/contracts/cms';
import { defineConfig } from 'sanity';
import { presentationTool } from 'sanity/presentation';
import { structureTool } from 'sanity/structure';
import { siteConfig } from './src/site.config';
import { studioProjectId as projectId, studioDataset as dataset } from './src/lib/studio-settings';
export { studioConfigured } from './src/lib/studio-settings';

// Browser-safe CMS identifiers only. No project is provisioned by T3.
export default defineConfig(
  projectId && dataset
    ? {
        name: 'site-1',
        title: `${siteConfig.name} Studio`,
        basePath: '/studio',
        projectId,
        dataset,
        plugins: [
          structureTool(),
          // Editor-only draft preview (REQ 08). Route allowlisting and cache
          // suppression live in src/app/api/draft-mode/enable/route.ts.
          presentationTool({
            previewUrl: {
              previewMode: {
                enable: '/api/draft-mode/enable',
              },
            },
          }),
        ],
        schema: { types: schemaTypes },
      }
    : [],
);
