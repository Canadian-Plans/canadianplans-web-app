'use client';

import { useEffect, useState } from 'react';
import { CpButton } from './elements';

export interface StickyCtaContent {
  readonly title: string;
  readonly detail: string;
  readonly button: string;
}

export interface CpStickyCtaProps {
  content: StickyCtaContent;
  selected?: boolean;
  floating?: boolean;
  anchorId?: string;
  suppressed?: boolean;
  showHomeIndicator?: boolean;
  onAction?: () => void;
}

export function CpStickyCta({
  content,
  selected = false,
  floating = false,
  anchorId,
  suppressed = false,
  showHomeIndicator = !floating,
  onAction,
}: CpStickyCtaProps) {
  const [anchorVisible, setAnchorVisible] = useState(true);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!floating) return;
    const anchor = anchorId ? document.getElementById(anchorId) : null;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setAnchorVisible(entry.isIntersecting);
    });
    if (anchor) observer.observe(anchor);
    else setAnchorVisible(false);

    function updateKeyboard() {
      const focused = document.activeElement;
      const editing =
        focused instanceof HTMLElement &&
        focused.matches('input:not([type="checkbox"]), textarea, select, [contenteditable="true"]');
      const reducedViewport = window.visualViewport
        ? window.visualViewport.height < window.innerHeight * 0.75
        : false;
      setKeyboardOpen(editing || reducedViewport);
    }
    document.addEventListener('focusin', updateKeyboard);
    function onFocusOut() {
      queueMicrotask(updateKeyboard);
    }
    document.addEventListener('focusout', onFocusOut);
    window.visualViewport?.addEventListener('resize', updateKeyboard);
    updateKeyboard();
    return () => {
      observer.disconnect();
      document.removeEventListener('focusin', updateKeyboard);
      document.removeEventListener('focusout', onFocusOut);
      window.visualViewport?.removeEventListener('resize', updateKeyboard);
    };
  }, [floating, anchorId]);

  const visible = !floating || (!anchorVisible && !keyboardOpen && !suppressed);
  return (
    <div
      className="cp-sticky-cta"
      data-floating={floating}
      data-visible={visible}
      data-selected={selected}
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className="cp-sticky-row">
        <div className="cp-sticky-summary">
          <p>{content.title}</p>
          <p>{content.detail}</p>
        </div>
        <CpButton tone={selected ? 'primary' : 'sun'} onClick={onAction}>
          {content.button}
        </CpButton>
      </div>
      {showHomeIndicator ? (
        <div className="cp-home-indicator" aria-hidden="true">
          <span />
        </div>
      ) : null}
    </div>
  );
}
