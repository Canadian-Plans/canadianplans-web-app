import { cache } from 'react';
import { SkipLink } from '@canadian-plans/ui';
import { CpButton } from '@canadian-plans/ui/canadian-plans';
import { Footer } from '@/components/shared/chrome';
import { SiteHeader } from '@/components/shared/site-header';
import { siteChrome, siteFooter } from '@content/site-chrome';
import { LegalBody } from '@/components/legal-body';
import { getLegalPage, type LegalPage as PublishedLegalPage } from '@/lib/legal';
import { legalDrafts, legalCopy as copy, legalAssets, type LegalRoute } from '@content/legal';
import { LegalContents, LegalHeaderControls } from './controls';
export const getLegalScreen = cache(getLegalPage);
export function LegalPage({ slug, page }: { slug: LegalRoute; page: PublishedLegalPage }) {
  const draft = legalDrafts[slug];
  const preview = page.source === 'test_placeholder';
  const title = preview ? draft.title : page.title;
  return (
    <>
      <SkipLink href="#legal-main" className="cp-legal-skip">
        {copy.skip}
      </SkipLink>
      <SiteHeader planHref="/pre-arrival-sim#plans" content={siteChrome} />
      <main id="legal-main" tabIndex={-1} data-source={page.source}>
        <header className="cp-legal-header">
          <div className="cp-container">
            <nav className="cp-legal-breadcrumb" aria-label={copy.breadcrumb}>
              <a href="/">{copy.home}</a>
              <span aria-hidden="true">{copy.separator}</span>
              <a href="/privacy">{copy.category}</a>
              <span aria-hidden="true">{copy.separator}</span>
              <span aria-current="page">{title}</span>
            </nav>
            <div className="cp-legal-header-spacer" aria-hidden="true" />
            <h1>{title}</h1>
            <div className="cp-legal-dates">
              <p>{preview ? draft.updated : copy.publishedHeader}</p>
              <p>
                {copy.publishedEffective} {preview ? copy.pending : page.effectiveDate}
              </p>
              <p data-testid="legal-version">
                {copy.version} {page.version}
              </p>
            </div>
            {preview ? (
              <p className="cp-legal-draft" data-testid="legal-placeholder">
                {copy.draft}
              </p>
            ) : null}
            <LegalHeaderControls slug={slug} />
          </div>
        </header>
        <div className={`cp-container cp-legal-body ${preview ? '' : 'cp-legal-published'}`}>
          {preview ? <LegalContents sections={draft.sections} /> : null}
          <article className="cp-legal-article" aria-label={title}>
            {preview ? (
              <>
                <section
                  className="cp-legal-short"
                  data-policy={slug}
                  aria-labelledby="legal-short-title"
                >
                  <h2 id="legal-short-title">{draft.shortTitle}</h2>
                  <ul>
                    {draft.short.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
                {draft.sections.map((section) => (
                  <section className="cp-legal-section" key={section.id}>
                    <h2 id={section.id} tabIndex={-1}>
                      {section.title}
                    </h2>
                    {section.paragraphs.map((text) => (
                      <p key={text}>{text}</p>
                    ))}
                    {section.bullets.length ? (
                      <ul>
                        {section.bullets.map((line) => (
                          <li key={line}>
                            {copy.bullet}
                            {line}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))}
              </>
            ) : (
              <LegalBody blocks={page.body} />
            )}
            <section className="cp-legal-contact" aria-labelledby="legal-contact-title">
              <div>
                <h2 id="legal-contact-title">{draft.contact.title}</h2>
                {(preview ? draft.contact.lines : [copy.publishedContact]).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <CpButton asChild>
                <a href={preview ? draft.contact.href : '/contact#contact-options'}>
                  {preview ? draft.contact.button : copy.contact}
                </a>
              </CpButton>
            </section>
          </article>
        </div>
      </main>
      <Footer brand={siteChrome.brand} content={siteFooter} assets={legalAssets} brandHref="/" />
    </>
  );
}
