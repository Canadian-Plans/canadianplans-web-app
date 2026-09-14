'use client';
import { defineConfig } from 'sanity';
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
        plugins: [structureTool()],
        schema: { types: [] },
      }
    : [],
);
