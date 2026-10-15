import { createRoot } from 'react-dom/client';
import {
  CookieConsentProvider,
  CookieSettingsTrigger,
} from '../../src/components/shared/cookie-consent';
import { Analytics } from '../../src/components/analytics';
import { trackPlanSelected } from '../../src/lib/analytics';
Object.assign(globalThis, { selectFixturePlan: () => trackPlanSelected('fixture-plan') });
createRoot(document.getElementById('root')!).render(
  <CookieConsentProvider>
    <main id="main-content" tabIndex={-1}>
      <CookieSettingsTrigger />
      <Analytics />
    </main>
  </CookieConsentProvider>,
);
