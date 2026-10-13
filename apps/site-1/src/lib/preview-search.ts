export interface PreviewSearchState {
  readonly status: 'idle' | 'invalid' | 'preview';
}

export function isValidPreviewSearch(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 80;
}
