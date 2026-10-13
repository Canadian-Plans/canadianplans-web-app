import { COOKIE_KEY, COOKIE_MAX_LENGTH, COOKIE_VERSION } from './cookie-consent';

/** Visibility only. This never grants consent, writes storage or loads a provider. */
export const cookieBootstrapScript = `(function () { try {
  var raw = localStorage.getItem(${JSON.stringify(COOKIE_KEY)});
  if (typeof raw === 'string' && raw.length <= ${COOKIE_MAX_LENGTH}) {
    var choice = JSON.parse(raw);
    if (choice && typeof choice === 'object' && !Array.isArray(choice) &&
      choice.version === ${COOKIE_VERSION} && typeof choice.analytics === 'boolean' &&
      typeof choice.marketing === 'boolean') {
      document.documentElement.setAttribute('data-cp-consent', 'stored');
    }
  }
} catch { /* Without a valid stored choice, show the essential-only banner. */ } })();`;
