import { createContext, useEffect, useState, type ReactNode } from 'react';
import type {
  ClientBusinessSettings,
  ClientDataStore,
  ClientRemoteApi,
  ClientRemoteTerminalSummary,
  ClientTerminalContext,
  createClientSyncService,
  createLocalCheckoutService
} from '@smart-pos/client-data';

import { CashierLoginScreen } from '../components/auth/CashierLoginScreen.js';
import { ForgotPasswordScreen } from '../components/auth/ForgotPasswordScreen.js';
import { LoadingScreen } from '../components/auth/LoadingScreen.js';
import { SignUpScreen } from '../components/auth/SignUpScreen.js';
import { SignUpSuccessScreen } from '../components/auth/SignUpSuccessScreen.js';
import { TerminalPickerScreen } from '../components/auth/TerminalPickerScreen.js';
import { prepareTerminalBundle, type TerminalBundle } from './prepare-terminal-bundle.js';
import { useAuth } from './use-auth.js';

type SignUpOutcome = { businessCode: string; email: string; tempPassword: string };
type AuthView =
  | { name: 'login'; prefill?: { email: string; password: string } }
  | { name: 'signUp' }
  | { name: 'signUpSuccess'; result: SignUpOutcome }
  | { name: 'forgotPassword' };

export type PosContextValue = {
  checkoutService: ReturnType<typeof createLocalCheckoutService>;
  logout: () => void;
  refreshSettings: () => Promise<void>;
  remoteApi: ClientRemoteApi;
  settings: ClientBusinessSettings;
  store: ClientDataStore;
  syncService: ReturnType<typeof createClientSyncService>;
  terminalContext: ClientTerminalContext;
};

export const PosContext = createContext<PosContextValue | null>(null);

export const PosProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const [authView, setAuthView] = useState<AuthView>({ name: 'login' });
  const [terminal, setTerminal] = useState<ClientRemoteTerminalSummary | null>(null);
  const [bundle, setBundle] = useState<TerminalBundle | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    const session = auth.session;
    if (!session || !terminal) {
      return;
    }

    let cancelled = false;

    void prepareTerminalBundle(session, terminal, {
      getAccessToken: auth.getAccessToken,
      refreshAccessToken: auth.refreshAccessToken
    })
      .then((prepared) => {
        if (!cancelled) {
          setSetupError(null);
          setBundle(prepared);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setSetupError(cause instanceof Error ? cause.message : 'Could not prepare this terminal');
        }
      });

    return () => {
      cancelled = true;
    };
    // Depends on the user identity, not the session object itself — a token
    // refresh replaces `auth.session` with a new object (same user) and must
    // not re-run this whole bootstrap/sync sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.session?.user.id, terminal, auth.getAccessToken, auth.refreshAccessToken]);

  const refreshSettings = async () => {
    if (!bundle) {
      return;
    }

    const settings = await bundle.refreshBusinessSettings();
    setBundle((previous) => (previous ? { ...previous, settings } : previous));
  };

  const backToLogin = () => {
    setTerminal(null);
    setBundle(null);
    setSetupError(null);
    auth.logout();
  };

  if (!auth.session) {
    if (authView.name === 'signUp') {
      return (
        <SignUpScreen
          onBack={() => setAuthView({ name: 'login' })}
          onSignedUp={(result) => setAuthView({ name: 'signUpSuccess', result })}
        />
      );
    }

    if (authView.name === 'signUpSuccess') {
      const { result } = authView;
      return (
        <SignUpSuccessScreen
          businessCode={result.businessCode}
          email={result.email}
          onContinue={() =>
            setAuthView({ name: 'login', prefill: { email: result.email, password: result.tempPassword } })
          }
          tempPassword={result.tempPassword}
        />
      );
    }

    if (authView.name === 'forgotPassword') {
      return (
        <ForgotPasswordScreen
          onBack={() => setAuthView({ name: 'login' })}
          onReset={(email, password) => setAuthView({ name: 'login', prefill: { email, password } })}
        />
      );
    }

    return (
      <CashierLoginScreen
        error={auth.error}
        initialEmail={authView.prefill?.email}
        initialPassword={authView.prefill?.password}
        onNavigateToForgotPassword={() => setAuthView({ name: 'forgotPassword' })}
        onNavigateToSignUp={() => setAuthView({ name: 'signUp' })}
        onSubmit={auth.login}
        submitting={auth.status === 'submitting'}
      />
    );
  }

  if (!terminal) {
    return (
      <TerminalPickerScreen
        accessToken={auth.session.accessToken}
        cashierName={auth.session.user.displayName}
        onBack={backToLogin}
        onSelect={setTerminal}
      />
    );
  }

  if (setupError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
        <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">{setupError}</p>
        <button
          className="text-sm font-semibold text-brand-600"
          onClick={() => {
            setSetupError(null);
            setTerminal(null);
          }}
          type="button"
        >
          Choose a different terminal
        </button>
      </div>
    );
  }

  if (!bundle) {
    return <LoadingScreen message="Preparing terminal…" />;
  }

  return (
    <PosContext.Provider
      value={{
        checkoutService: bundle.checkoutService,
        logout: backToLogin,
        refreshSettings,
        remoteApi: bundle.remoteApi,
        settings: bundle.settings,
        store: bundle.store,
        syncService: bundle.syncService,
        terminalContext: bundle.terminalContext
      }}
    >
      {children}
    </PosContext.Provider>
  );
};
