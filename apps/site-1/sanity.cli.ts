import { defineCliConfig } from 'sanity/cli';
import { studioProjectId, studioDataset } from './src/lib/studio-settings';

/** Local schema tooling uses the same public project identifiers as the Studio. */
export default defineCliConfig({
  api: { projectId: studioProjectId, dataset: studioDataset },
});
