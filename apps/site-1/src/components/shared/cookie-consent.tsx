'use client';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@canadian-plans/ui';
import { CpAsset, CpButton } from '@canadian-plans/ui/canadian-plans';
import { cookieCopy as copy, systemAssets as assets } from '@content/system';
import {
  cookieSnapshot,
  parseCookieChoice,
  saveCookieChoice,
  subscribeCookieChoice,
} from '@/lib/cookie-consent';
import './cookie-consent.css';
const Context = createContext<{
  analytics: boolean;
  marketing: boolean;
  openSettings: () => void;
} | null>(null);
const nullSnapshot = () => null;
const hydrationSubscribe = () => () => {};
const hydratedSnapshot = () => true;
const serverHydration = () => false;
export function useCookieConsent() {
  return useContext(Context);
}
export function CookieSettingsTrigger({
  children,
  className,
  id,
}: {
  children?: ReactNode;
  className?: string;
  id?: string;
}) {
  const context = useCookieConsent();
  return context ? (
    <button
      type="button"
      id={id}
      className={className ?? 'cp-cookie-trigger'}
      onClick={context.openSettings}
    >
      {children ?? copy.settings}
    </button>
  ) : (
    <a href="/privacy#legal-cookie-settings" className={className}>
      {children ?? copy.settings}
    </a>
  );
}
export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeCookieChoice, cookieSnapshot, nullSnapshot);
  const hydrated = useSyncExternalStore(hydrationSubscribe, hydratedSnapshot, serverHydration);
  const choice = useMemo(() => parseCookieChoice(snapshot), [snapshot]);
  useEffect(() => {
    if (!hydrated) return;
    if (choice) document.documentElement.setAttribute('data-cp-consent', 'stored');
    else document.documentElement.removeAttribute('data-cp-consent');
  }, [hydrated, choice]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ analytics: false, marketing: false });
  const [notice, setNotice] = useState('');
  const trigger = useRef<HTMLElement | null>(null);
  const openedFromBanner = useRef(false);
  function openSettings() {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openedFromBanner.current = Boolean(trigger.current?.closest('.cp-cookie-banner'));
    setDraft({ analytics: choice?.analytics ?? false, marketing: choice?.marketing ?? false });
    setOpen(true);
  }
  function save(analytics: boolean, marketing: boolean) {
    const result = saveCookieChoice({ version: 1, analytics, marketing });
    setNotice(result.persisted ? copy.saved : copy.sessionSaved);
    setOpen(false);
  }
  function returnFocus() {
    if (trigger.current?.isConnected) trigger.current.focus();
    else if (openedFromBanner.current && !parseCookieChoice(cookieSnapshot())) {
      const banner = document.querySelector('.cp-cookie-banner');
      const choose =
        banner &&
        [...banner.querySelectorAll<HTMLButtonElement>('button')].find(
          (button) =>
            button.textContent === copy.choose && button.getBoundingClientRect().width > 0,
        );
      choose?.focus();
    } else document.querySelector<HTMLElement>('main,[id="main-content"]')?.focus();
  }
  return (
    <Context.Provider
      value={{
        analytics: hydrated && (choice?.analytics ?? false),
        marketing: hydrated && (choice?.marketing ?? false),
        openSettings,
      }}
    >
      {children}
      {!choice && !open ? (
        <section className="cp-design cp-cookie-banner" aria-labelledby="cookie-banner-title">
          <div>
            <h2 id="cookie-banner-title">{copy.title}</h2>
            <p>{copy.description}</p>
            <a className="cp-cookie-privacy-desktop" href="/privacy">
              {copy.privacy}
            </a>
          </div>
          <div className="cp-cookie-banner-actions">
            <CpButton tone="ink" onClick={() => save(true, true)}>
              {copy.accept}
            </CpButton>
            <CpButton tone="outline" onClick={() => save(false, false)}>
              {copy.reject}
            </CpButton>
            <CpButton tone="outline" className="cp-cookie-choose-desktop" onClick={openSettings}>
              {copy.choose}
            </CpButton>
          </div>
          <div className="cp-cookie-banner-links">
            <button type="button" onClick={openSettings}>
              {copy.choose}
            </button>
            <a href="/privacy">{copy.privacy}</a>
          </div>
        </section>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="cp-design cp-cookie-dialog"
          showCloseButton={false}
          aria-labelledby="cookie-settings-title"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            document.getElementById('cookie-settings-title')?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus();
          }}
        >
          <div className="cp-cookie-dialog-heading">
            <DialogTitle id="cookie-settings-title" tabIndex={-1}>
              {copy.settings}
            </DialogTitle>
            <DialogClose asChild>
              <button type="button" className="cp-cookie-close" aria-label={copy.close}>
                {copy.cross}
              </button>
            </DialogClose>
          </div>
          <DialogDescription>{copy.intro}</DialogDescription>
          {copy.categories.map((category) => {
            const essential = category.id === 'essential';
            const checked =
              essential || draft[category.id === 'marketing' ? 'marketing' : 'analytics'];
            return (
              <div className="cp-cookie-category" key={category.id}>
                <div>
                  <div>
                    <h3 id={`cookie-${category.id}-label`}>{category.label}</h3>
                    {essential ? <span>{copy.always}</span> : null}
                  </div>
                  <p id={`cookie-${category.id}-description`}>{category.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-labelledby={`cookie-${category.id}-label`}
                  aria-describedby={`cookie-${category.id}-description`}
                  aria-checked={checked}
                  disabled={essential}
                  onClick={() => setDraft({ ...draft, [category.id]: !checked })}
                >
                  <CpAsset asset={checked ? assets.toggleOn : assets.toggleOff} />
                </button>
              </div>
            );
          })}
          <div className="cp-cookie-dialog-actions">
            <CpButton tone="outline" onClick={() => save(false, false)}>
              {copy.reject}
            </CpButton>
            <CpButton tone="ink" onClick={() => save(draft.analytics, draft.marketing)}>
              {copy.save}
            </CpButton>
          </div>
        </DialogContent>
      </Dialog>
      <p className="sr-only" role="status">
        {notice}
      </p>
    </Context.Provider>
  );
}
