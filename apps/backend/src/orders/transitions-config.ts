/**
 * TEST-only switch for the operational order transitions (dispatch and
 * activation). Production dispatch/activation stay disabled until
 * OPEN_INPUTS #15 (transition prerequisites) is resolved, so this loader
 * ignores the flag entirely when `NODE_ENV=production`.
 */
export function loadOperationalTransitionsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === 'production') return false;
  return env.ORDER_OPERATIONAL_TRANSITIONS === '1' || env.ORDER_OPERATIONAL_TRANSITIONS === 'true';
}
