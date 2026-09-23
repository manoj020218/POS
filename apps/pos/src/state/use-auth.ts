import { useCallback, useMemo, useRef, useState } from 'react';
import { createHttpAuthClient, HttpRequestError, type ClientAuthResult } from '@smart-pos/client-data';

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
  const initialSession = useMemo(() => readStoredSession(), []);
  const [session, setSession] = useState<ClientAuthResult | null>(initialSession);
  const [status, setStatus] = useState<AuthStatus>(initialSession ? 'authenticated' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef(initialSession);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const applySession = useCallback((next: ClientAuthResult | null) => {
    sessionRef.current = next;
    setSession(next);
    writeStoredSession(next);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setStatus('submitting');
      setError(null);

      try {
        const result = await authClient.login({ deviceName, email, password });
        applySession(result);
        setStatus('authenticated');
        return result;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Login failed';
        setError(message);
        setStatus('error');
        return null;
      }
    },
    [applySession, authClient]
  );

  const logout = useCallback(() => {
    const refreshToken = sessionRef.current?.refreshToken;
    applySession(null);
    setStatus('idle');
    setError(null);
    if (refreshToken) {
      void authClient.logout(refreshToken).catch(() => undefined);
    }
  }, [applySession, authClient]);

  // A session's access token expires every 15 minutes; this is called reactively
  // whenever a request comes back 401, not on a timer. Concurrent 401s (several
  // in-flight requests expiring around the same moment) share one refresh call —
  // the server rotates the refresh token on use, so firing more than one at once
  // would make the second fail against an already-consumed token.
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const attempt = (async () => {
      const current = sessionRef.current;
      if (!current) {
        return null;
      }

      try {
        const result = await authClient.refresh(current.refreshToken);
        applySession(result);
        return result.accessToken;
      } catch (cause) {
        // Only a genuine auth rejection (refresh token expired/invalid/revoked)
        // means the session is actually over. A network blip, timeout, or the
        // API being briefly unreachable throws a plain error here too — treating
        // that the same as "log out" was wiping a perfectly good 30-day session
        // (and the stored local data with it) on every transient connectivity hiccup.
        if (cause instanceof HttpRequestError && cause.status === 401) {
          logout();
        }
        return null;
      }
    })().finally(() => {
      refreshPromiseRef.current = null;
    });

    refreshPromiseRef.current = attempt;
    return attempt;
  }, [applySession, authClient, logout]);

  const getAccessToken = useCallback(() => sessionRef.current?.accessToken ?? '', []);

  // The server is the source of truth for the rename itself (via
  // remoteApi.updateOwnProfile); this just reflects that into the locally
  // stored session so the top bar updates immediately without a re-login.
  const updateDisplayName = useCallback(
    (displayName: string) => {
      const current = sessionRef.current;
      if (!current) {
        return;
      }
      applySession({ ...current, user: { ...current.user, displayName } });
    },
    [applySession]
  );

  return {
    authClient,
    error,
    getAccessToken,
    login,
    logout,
    refreshAccessToken,
    session,
    status,
    updateDisplayName
  };
};

export type UseAuthReturn = ReturnType<typeof useAuth>;
