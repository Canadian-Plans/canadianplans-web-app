import { CpAsset, CpButton } from '@canadian-plans/ui/canadian-plans';
import { metadataCopy } from '@content/metadata';
import { pageMetadata } from '@/lib/page-metadata';
import { missingCopy as copy, systemAssets as assets } from '@content/system';
import { SystemShell } from '@/components/system/shell';
import { SystemLinkCard } from '@/components/system/link-card';
import { SiteSearchForm } from '@/components/shared/site-search-form';
import './(system)/system.css';
export const metadata = pageMetadata('/', {
  title: metadataCopy.missingTitle,
  description: metadataCopy.missingDescription,
  robots: { index: false, follow: false },
});
export default function NotFound() {
  return (
    <div className="cp-design cp-system">
      <SystemShell>
        <main id="main-content" tabIndex={-1} className="cp-system-missing">
          <div className="cp-system-signal">
            <span className="cp-system-signal-desktop">
              <CpAsset asset={assets.signalDesktop} />
            </span>
            <span className="cp-system-signal-mobile">
              <CpAsset asset={assets.signalMobile} />
            </span>
          </div>
          <p className="cp-system-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="cp-system-missing-intro">{copy.intro}</p>
          <SiteSearchForm />
          <div className="cp-system-quick-links">
            {copy.cards.map((card) => (
              <SystemLinkCard key={card.href} {...card} icon={assets[card.icon]} />
            ))}
          </div>
          <div className="cp-system-missing-assistance">
            <p className="cp-system-missing-help">{copy.help}</p>
            <CpButton asChild tone="outline">
              <a href="/contact#contact-options">
                <CpAsset asset={assets.chat} />
                {copy.helpButton}
              </a>
            </CpButton>
          </div>
        </main>
      </SystemShell>
    </div>
  );
}
