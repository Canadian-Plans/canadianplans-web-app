'use client';

import { useState } from 'react';
import type { ChromeContent, ComponentAssets } from '@content/components';
import { Navigation } from '@/components/shared/component-lab-client';

export function CategoryNavigation({
  content,
  assets,
}: {
  content: ChromeContent;
  assets: ComponentAssets;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  function scrollToPlans() {
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
  }
  function scrollToContact() {
    document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
  }
  return (
    <Navigation
      content={content}
      assets={assets}
      menuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      onAction={scrollToPlans}
      onContact={scrollToContact}
      brandHref="/"
    />
  );
}
