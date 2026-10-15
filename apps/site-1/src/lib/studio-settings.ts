/** Browser-safe identifiers, shared with the server's existing unconfigured fallback. */
export const studioProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
export const studioDataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim();
export const studioConfigured = Boolean(studioProjectId && studioDataset);
