import { createClient } from '@supabase/supabase-js';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { sendStaffAuthError } from '../http/staff-errors.js';

export type AssuranceLevel = 'aal1' | 'aal2';

export interface VerifiedStaffSession {
  actorId: string;
  verifiedEmail: string;
  assuranceLevel: AssuranceLevel;
}

export interface StaffSessionVerifier {
  verify(accessToken: string): Promise<VerifiedStaffSession | undefined>;
}

function authClient() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !publishableKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  }).auth;
}

export class SupabaseStaffSessionVerifier implements StaffSessionVerifier {
  async verify(accessToken: string): Promise<VerifiedStaffSession | undefined> {
    // A fresh stateless client is created for each request. Identity and AAL
    // both come from Supabase Auth server calls for this exact bearer token.
    const auth = authClient();
    const userResult = await auth.getUser(accessToken);
    const user = userResult.data.user;
    if (userResult.error || !user || !user.email || !user.email_confirmed_at) {
      return undefined;
    }

    const assurance = await auth.mfa.getAuthenticatorAssuranceLevel(accessToken);
    if (assurance.error || !assurance.data.currentLevel) return undefined;

    return {
      actorId: user.id,
      verifiedEmail: user.email,
      assuranceLevel: assurance.data.currentLevel === 'aal2' ? 'aal2' : 'aal1',
    };
  }
}

function bearerToken(req: Request): string | undefined {
  const authorization = req.get('authorization');
  if (!authorization || authorization.length > 8_200) return undefined;
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  return match?.[1];
}

export function requireStaffSession(verifier: StaffSessionVerifier): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = bearerToken(req);
    if (!token) {
      sendStaffAuthError(res, req.id, 'missing_session', 401);
      return;
    }

    try {
      const session = await verifier.verify(token);
      if (!session) {
        sendStaffAuthError(res, req.id, 'invalid_session', 401);
        return;
      }
      req.staffSession = session;
      next();
    } catch {
      sendStaffAuthError(res, req.id, 'invalid_session', 401);
    }
  };
}
