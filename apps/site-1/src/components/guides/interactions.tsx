'use client';
import { useEffect, useState } from 'react';
import { CpAsset, CpButton } from '@canadian-plans/ui/canadian-plans';
import { guideAssets, guideCopy } from '@content/guides';

export function GuideContents({
  items,
  mobile = false,
}: {
  items: readonly { id: string; title: string }[];
  mobile?: boolean;
}) {
  const [active, setActive] = useState('needs');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (current) setActive(current.target.id);
      },
      { rootMargin: '0px 0px -60% 0px', threshold: 0 },
    );
    for (const item of items) {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [items]);
  const links = (
    <nav aria-label={guideCopy.contents}>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? 'location' : undefined}
              onClick={() => {
                setActive(item.id);
                setOpen(false);
              }}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
  return mobile ? (
    <div className="cp-guide-mobile-contents">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="guide-mobile-contents-links"
        onClick={() => setOpen(!open)}
      >
        <CpAsset asset={guideAssets.list} />
        <span>
          <strong>{guideCopy.contents}</strong>
          <small>{guideCopy.contentsDetail}</small>
        </span>
        <CpAsset asset={guideAssets.chevron} />
      </button>
      <div id="guide-mobile-contents-links" hidden={!open}>
        {links}
      </div>
    </div>
  ) : (
    <div className="cp-guide-desktop-contents">
      <p>{guideCopy.contents}</p>
      {links}
    </div>
  );
}
export function GuideHelpful() {
  const [choice, setChoice] = useState<'yes' | 'no' | null>(null);
  return (
    <div className="cp-guide-helpful">
      <p>{guideCopy.helpful.label}</p>
      {(['yes', 'no'] as const).map((value) => (
        <CpButton
          key={value}
          tone={choice === value ? 'ink' : 'outline'}
          aria-pressed={choice === value}
          onClick={() => setChoice(value)}
        >
          {guideCopy.helpful[value]}
        </CpButton>
      ))}
      <span className="sr-only" role="status">
        {choice ? guideCopy.helpful.feedback : ''}
      </span>
    </div>
  );
}
export function GuideShare() {
  const [status, setStatus] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  useEffect(
    () =>
      setShareUrl(
        `https://wa.me/?text=${encodeURIComponent(window.location.origin + window.location.pathname)}`,
      ),
    [],
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.origin + window.location.pathname);
      setStatus(guideCopy.share.copied);
    } catch {
      setStatus(guideCopy.share.failed);
    }
  }
  return (
    <div className="cp-guide-share">
      <h2>{guideCopy.share.title}</h2>
      <div>
        <CpButton asChild tone="outline">
          <a href={shareUrl || undefined} target="_blank" rel="noopener noreferrer">
            {guideCopy.share.whatsapp}
          </a>
        </CpButton>
        <CpButton tone="outline" onClick={copy}>
          {status === guideCopy.share.copied ? status : guideCopy.share.copy}
        </CpButton>
      </div>
      <span className="sr-only" role="status">
        {status}
      </span>
    </div>
  );
}
