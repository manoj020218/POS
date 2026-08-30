import { useCallback, useMemo, useState } from 'react';
import { createHttpAuthClient, type ClientAuthResult } from '@smart-pos/client-data';

import { apiBaseUrl, deviceName } from '../lib/api-config.js';

const storageKey = 'smart-pos-pos:session';

const readStoredSession = (): ClientAuthResult | null => {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as ClientAuthResult) : null;
  } catch {
    return null;
  }
};

const writeStoredSession = (session: ClientAuthResult | null) => {
  try {
    if (session) {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // Storage unavailable (private mode, etc.) — session just won't survive a reload.
  }
};

export type AuthStatus = 'authenticated' | 'error' | 'idle' | 'submitting';

export const useAuth = () => {
  const authClient = useMemo(() => createHttpAuthClient({ baseUrl: apiBaseUrl }), []);
  const [session, setSession] = useState<ClientAuthResult | null>(() => readStoredSession());
  const [status, setStatus] = useState<AuthStatus>(session ? 'authenticated' : 'idle');
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (email: string, password: string) => {
      setStatus('submitting');
      setError(null);

      try {
        const result = await authClient.login({ deviceName, email, password });
        setSession(result);
        writeStoredSession(result);
        setStatus('authenticated');
        return result;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Login failed';
        setError(message);
        setStatus('error');
        return null;
      }
    },
    [authClient]
  );

  const logout = useCallback(() => {
    const refreshToken = session?.refreshToken;
    setSession(null);
    writeStoredSession(null);
    setStatus('idle');
    setError(null);
    if (refreshToken) {
      void authClient.logout(refreshToken).catch(() => undefined);
    }
  }, [authClient, session]);

  return { authClient, error, login, logout, session, status };
};

export type UseAuthReturn = ReturnType<typeof useAuth>;
