export interface PostalPreviewState {
  readonly status: 'idle' | 'invalid' | 'preview';
}

/** Format validation only. Never claims coverage or calls an availability service. */
export function isValidPostalCode(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i.test(value.trim())
  );
}
