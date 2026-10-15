'use client';
import { useEffect, useState } from 'react';
import { CookieSettingsTrigger } from '@/components/shared/cookie-consent';
import { CpAsset, CpButton } from '@canadian-plans/ui/canadian-plans';
import {
  legalCopy as copy,
  legalAssets as assets,
  type LegalRoute,
  type LegalDraftSection,
} from '@content/legal';
export function LegalHeaderControls({ slug }: { slug: LegalRoute }) {
  return (
    <>
      <nav className="cp-legal-tabs" aria-label={copy.category}>
        <CpButton asChild tone={slug === 'privacy' ? 'ink' : 'outline'} className="cp-legal-tab">
          <a href="/privacy" aria-current={slug === 'privacy' ? 'page' : undefined}>
            {copy.privacyTab}
          </a>
        </CpButton>
        <CpButton asChild tone={slug === 'terms' ? 'ink' : 'outline'} className="cp-legal-tab">
          <a href="/terms" aria-current={slug === 'terms' ? 'page' : undefined}>
            {copy.termsTab}
          </a>
        </CpButton>
        <CpButton asChild tone="outline" className="cp-legal-tab">
          <CookieSettingsTrigger id="legal-cookie-settings">{copy.cookieTab}</CookieSettingsTrigger>
        </CpButton>
      </nav>
    </>
  );
}
export function LegalContents({ sections }: { sections: readonly LegalDraftSection[] }) {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const update = () => {
      const id = window.location.hash.slice(1);
      if (sections.some((section) => section.id === id)) setActive(id);
    };
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, [sections]);
  return (
    <aside className="cp-legal-contents" data-expanded={expanded}>
      <h2>{copy.contents}</h2>
      <nav aria-label={copy.contents} id="legal-section-links">
        {sections.map((section, i) => (
          <a
            href={`#${section.id}`}
            key={section.id}
            data-extra={i >= 4}
            aria-current={active === section.id ? 'location' : undefined}
            onClick={() => setActive(section.id)}
          >
            <span>{section.title}</span>
            <CpAsset asset={assets.jump} />
          </a>
        ))}
      </nav>
      <button
        type="button"
        className="cp-legal-contents-toggle"
        aria-expanded={expanded}
        aria-controls="legal-section-links"
        onClick={() => setExpanded(!expanded)}
      >
        <span>
          {expanded ? copy.showFewer : `${copy.showAll} ${sections.length} ${copy.sections}`}
        </span>
        <span className="cp-legal-expand-icon" data-expanded={expanded}>
          <CpAsset asset={assets.expand} />
        </span>
      </button>
    </aside>
  );
}
