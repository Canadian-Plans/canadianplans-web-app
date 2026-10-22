import type { MetadataRoute } from 'next';

/** Web app manifest with the owner's logo icon (22 October 2026). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Canadian Plans',
    short_name: 'Canadian Plans',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
