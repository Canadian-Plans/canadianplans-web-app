/** Deterministic visual fixtures. Performance audits deliberately do not use this helper. */
export async function installAuditContext(
  context,
  { seedConsent = true, eagerImages = true } = {},
) {
  await context.addInitScript(
    ({ seedConsent, eagerImages }) => {
      if (seedConsent)
        localStorage.setItem(
          'canadian-plans.cookie-choices.v1',
          JSON.stringify({ version: 1, analytics: false, marketing: false }),
        );
      if (!eagerImages) return;
      // Full-page captures must decode the images below the fold too.
      const eager = () => {
        for (const image of globalThis.document.images) image.loading = 'eager';
      };
      new globalThis.MutationObserver(eager).observe(globalThis.document, {
        childList: true,
        subtree: true,
      });
      eager();
    },
    { seedConsent, eagerImages },
  );
}
