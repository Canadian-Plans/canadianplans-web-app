import type { InternetPlan } from '@content/home-internet';

export interface InternetLookupInput {
  readonly postalCode: unknown;
  readonly moveInDate?: unknown;
}
export type InternetLookupResult =
  | {
      readonly status: 'invalid';
      readonly field: 'postalCode' | 'moveInDate';
      readonly previewOnly: true;
    }
  | {
      readonly status: 'available';
      readonly postalCode: string;
      readonly address: string;
      readonly plans: readonly InternetPlan[];
      readonly earliestInstall: string;
      readonly previewOnly: true;
    }
  | { readonly status: 'unavailable'; readonly postalCode: string; readonly previewOnly: true }
  | {
      readonly status: 'error';
      readonly reason: 'unconfigured' | 'lookup-failed';
      readonly previewOnly: true;
    };

export function normalizeInternetPostalCode(value: string): string {
  const code = value.trim().toUpperCase().replace(/[ -]/g, '');
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/** Validate the optional calendar value, without inferring installation policy. */
export function isValidMoveInDate(value: unknown): boolean {
  if (value === undefined || value === '') return true;
  if (typeof value !== 'string') return false;
  const match = /^(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})$/.exec(value.trim());
  if (!match) return false;
  const day = Number(match[1]),
    month = Number(match[2]),
    year = Number(match[3]);
  if (year < 1000 || year > 9999) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
