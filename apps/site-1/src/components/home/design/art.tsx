import { CpAsset } from '@canadian-plans/ui/canadian-plans';
import { redesignAssets, type RedesignAssetKey } from '@content/home-redesign';

/** Decorative illustration from the export; its size comes from the surrounding component. */
export function HomeArt({ name }: { name: RedesignAssetKey }) {
  return <CpAsset asset={redesignAssets[name]} />;
}
