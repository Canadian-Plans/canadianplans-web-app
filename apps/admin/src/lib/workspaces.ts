/**
 * Placeholder workspace list for the WorkspaceSwitcher (T2 scaffold). Real
 * data comes from a backend "my memberships" endpoint (PLATFORM_CONTEXT.md
 * §4b bootstrap: verified staff → own memberships) once staff auth lands.
 * See OPEN_INPUTS.md for the still-open question this stands in for.
 */
export interface WorkspaceSummary {
  slug: string;
  name: string;
}

export const PLACEHOLDER_WORKSPACES: readonly WorkspaceSummary[] = [
  { slug: 'site-1', name: 'Site 1 — SIM' },
  { slug: 'site-2', name: 'Site 2 — Mobile Internet' },
  { slug: 'site-3', name: 'Site 3 — Home Internet' },
];
