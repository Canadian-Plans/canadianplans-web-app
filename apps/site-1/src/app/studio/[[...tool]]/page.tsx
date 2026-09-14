import { Studio } from '../../../components/studio';
export { metadata, viewport } from 'next-sanity/studio';
export const dynamic = 'force-static';
export default function StudioPage() {
  return <Studio />;
}
