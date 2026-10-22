import { z } from 'zod';

const verificationSchema = z.object({
  success: z.literal(true),
  hostname: z.string(),
  action: z.string(),
});

/** Validate once with the provider; never cache successful challenge tokens. */
export function createTurnstileVerifier(
  config: { secret?: string; hostname?: string; hostnames?: readonly string[]; action: string },
  request: typeof fetch = fetch,
): (token: string | undefined) => Promise<boolean> {
  const hostnames = config.hostnames ?? (config.hostname ? [config.hostname] : []);
  const configuredHosts =
    hostnames.length > 0 &&
    hostnames.length <= 20 &&
    hostnames.every((host) => /^(?:[a-z0-9-]+\.)*[a-z0-9-]+$/.test(host));
  return async (token) => {
    if (!config.secret || !configuredHosts || !config.action || !token || token.length > 2048) {
      return false;
    }
    // Cloudflare's public test secrets must never enable the runtime admission path.
    if (/^[123]x0{10,}/.test(config.secret)) return false;
    try {
      const response = await request('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret: config.secret, response: token }),
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
      if (!response.ok) return false;
      const data: unknown = await response.json();
      const result = verificationSchema.safeParse(data);
      return (
        result.success &&
        hostnames.includes(result.data.hostname) &&
        result.data.action === config.action
      );
    } catch {
      // Neither the token, provider response nor exception belongs in logs.
      return false;
    }
  };
}
