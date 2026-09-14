'use client';
import { schemaTypes } from '@canadian-plans/contracts/cms';
import { defineConfig } from 'sanity';
import { presentationTool } from 'sanity/presentation';
import { structureTool } from 'sanity/structure';

// Browser-safe CMS identifiers only. No project is provisioned by T3.
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim();
export const studioConfigured = Boolean(projectId && dataset);
export default defineConfig(
  projectId && dataset
    ? {
        name: 'site-1',
        title: 'Site 1 Studio',
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
