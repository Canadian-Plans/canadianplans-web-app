import { useSyncExternalStore } from 'react';
let pathname = '/track';
Object.assign(globalThis, {
  navigateFixture: (next: string) => {
    pathname = next;
    globalThis.dispatchEvent(new Event('fixture-navigation'));
  },
});
const subscribe = (notify: () => void) => {
  globalThis.addEventListener('fixture-navigation', notify);
  return () => globalThis.removeEventListener('fixture-navigation', notify);
};
export function usePathname() {
  return useSyncExternalStore(
    subscribe,
    () => pathname,
    () => '/track',
  );
}
