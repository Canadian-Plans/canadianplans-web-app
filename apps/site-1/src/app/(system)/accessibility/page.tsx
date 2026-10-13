import { pageMetadata } from '@/lib/page-metadata';
import type { Metadata } from 'next';
import { CpAsset, CpButton, CpImageSlot } from '@canadian-plans/ui/canadian-plans';
import { accessibilityCopy as copy, systemAssets as assets } from '@content/system';
import { SystemShell } from '@/components/system/shell';
import { SystemLinkCard } from '@/components/system/link-card';
export const metadata: Metadata = pageMetadata('/accessibility', { title: copy.title });
export default function Page() {
  return (
    <SystemShell>
      <main id="main-content" tabIndex={-1} className="cp-system-accessibility">
        <header className="cp-system-accessibility-hero">
          <div className="cp-system-container">
            <p className="cp-system-eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p>{copy.intro}</p>
            <p>{copy.reviewed}</p>
          </div>
        </header>
        <div className="cp-system-accessibility-body cp-system-container">
          <div className="cp-system-accessibility-content">
            <section>
              <h2>{copy.commitmentTitle}</h2>
              <p>{copy.commitment}</p>
            </section>
            <section>
              <h2>{copy.practicesTitle}</h2>
              <ul>
                {copy.practices.map((practice) => (
                  <li key={practice}>
                    <CpAsset asset={assets.check} />
                    <span>{practice}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2>{copy.issuesTitle}</h2>
              <p>{copy.issues}</p>
            </section>
            <section className="cp-system-ways">
              <h2>{copy.waysTitle}</h2>
              <div className="cp-system-ways-copy">
                <p>{copy.ways}</p>
                <div className="cp-system-contact-options">
                  {copy.contacts.map((contact) => (
                    <SystemLinkCard key={contact.icon} {...contact} icon={assets[contact.icon]} />
                  ))}
                </div>
              </div>
              <CpImageSlot
                className="cp-system-advisor"
                icon={assets.image}
                label={copy.imageLabel}
                caption={copy.caption}
              />
            </section>
            <section>
              <h2>{copy.problemTitle}</h2>
              <p>{copy.problem}</p>
            </section>
            <aside className="cp-system-report">
              <div>
                <h2>{copy.contactTitle}</h2>
                <p>
                  <a href={`mailto:${copy.contactEmail}`}>{copy.contactEmail}</a>
                  <span className="cp-system-contact-dot" aria-hidden="true">
                    {' '}
                    ·{' '}
                  </span>
                  <a href="tel:18885550199">{copy.contactPhone}</a>
                </p>
              </div>
              <CpButton asChild tone="sun">
                <a href={`mailto:${copy.contactEmail}`}>{copy.contactButton}</a>
              </CpButton>
            </aside>
          </div>
        </div>
      </main>
    </SystemShell>
  );
}
