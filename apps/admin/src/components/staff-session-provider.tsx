'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { StaffWorkspace } from '@canadian-plans/contracts';

import { BackendError, getStaffWorkspaces } from '../lib/api';
import { getStaffAuth, isStaffAuthConfigured } from '../lib/supabase-auth';

type SessionStatus = 'loading' | 'signed_out' | 'signed_in' | 'configuration_missing' | 'error';

interface StaffSessionState {
  status: SessionStatus;
  accessToken?: string;
  workspaces: readonly StaffWorkspace[];
  reason?: string;
  refreshWorkspaces(): Promise<void>;
  signOut(): Promise<void>;
}

const StaffSessionContext = createContext<StaffSessionState | undefined>(undefined);

export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [accessToken, setAccessToken] = useState<string>();
  const [workspaces, setWorkspaces] = useState<readonly StaffWorkspace[]>([]);
  const [reason, setReason] = useState<string>();
  const generation = useRef(0);
  const invalidate = useCallback(() => {
    ++generation.current;
  }, []);

  const load = useCallback(async (token: string) => {
    const requestGeneration = ++generation.current;
    setAccessToken(undefined);
    setWorkspaces([]);
    setStatus('loading');
    try {
      const result = await getStaffWorkspaces(token);
      if (requestGeneration !== generation.current) return;
      setAccessToken(token);
      setWorkspaces(result.workspaces);
      setReason(undefined);
      setStatus('signed_in');
    } catch (error) {
      if (requestGeneration !== generation.current) return;
      setAccessToken(undefined);
      setWorkspaces([]);
      setReason(error instanceof BackendError ? error.code : 'internal_error');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!isStaffAuthConfigured()) {
      setStatus('configuration_missing');
      return;
    }
    const auth = getStaffAuth();
    let current = true;
    const initialGeneration = generation.current;
    void auth.getSession().then(({ data }) => {
      if (!current || initialGeneration !== generation.current) return;
      if (data.session) void load(data.session.access_token);
      else setStatus('signed_out');
    });
    const listener = auth.onAuthStateChange((_event, nextSession) => {
      if (!current) return;
      ++generation.current;
      if (nextSession) void load(nextSession.access_token);
      else {
        setAccessToken(undefined);
        setWorkspaces([]);
        setReason(undefined);
        setStatus('signed_out');
      }
    });
    return () => {
      current = false;
      invalidate();
      listener.data.subscription.unsubscribe();
    };
  }, [load, invalidate]);

  const refreshWorkspaces = useCallback(async () => {
    if (accessToken) await load(accessToken);
  }, [accessToken, load]);
  const signOut = useCallback(async () => {
    ++generation.current;
    setAccessToken(undefined);
    setWorkspaces([]);
    setReason(undefined);
    setStatus('signed_out');
    if (isStaffAuthConfigured()) await getStaffAuth().signOut();
  }, []);
  const value = useMemo<StaffSessionState>(
    () => ({ status, accessToken, workspaces, reason, refreshWorkspaces, signOut }),
    [status, accessToken, workspaces, reason, refreshWorkspaces, signOut],
  );

  return <StaffSessionContext.Provider value={value}>{children}</StaffSessionContext.Provider>;
}

export function useStaffSession(): StaffSessionState {
  const value = useContext(StaffSessionContext);
  if (!value) throw new Error('useStaffSession must be used inside StaffSessionProvider');
  return value;
}
