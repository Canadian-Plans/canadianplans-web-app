import { LegalBody } from '@/components/legal-body';
import { getLegalPage } from '@/lib/legal';

export default async function Page() {
  const page = await getLegalPage('privacy');
  return (
    <article className="space-y-4">
      {page.source === 'test_placeholder' ? (
        <p className="text-sm text-muted-foreground" data-testid="legal-placeholder">
          TEST placeholder — owner-approved text pending.
        </p>
      ) : null}
      <h1 className="text-3xl">{page.title}</h1>
      <p className="text-sm text-muted-foreground" data-testid="legal-version">
        Version {page.version} · effective {page.effectiveDate}
      </p>
      <LegalBody blocks={page.body} />
    </article>
  );
}
