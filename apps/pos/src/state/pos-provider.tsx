import { createContext, useEffect, useState, type ReactNode } from 'react';
import type {
  ClientBusinessSettings,
  ClientDataStore,
  ClientRemoteTerminalSummary,
  ClientTerminalContext,
  createClientSyncService,
  createLocalCheckoutService
} from '@smart-pos/client-data';

import { CashierLoginScreen } from '../components/auth/CashierLoginScreen.js';
import { LoadingScreen } from '../components/auth/LoadingScreen.js';
import { TerminalPickerScreen } from '../components/auth/TerminalPickerScreen.js';
import { prepareTerminalBundle, type TerminalBundle } from './prepare-terminal-bundle.js';
import { useAuth } from './use-auth.js';

export type PosContextValue = {
  checkoutService: ReturnType<typeof createLocalCheckoutService>;
  logout: () => void;
  settings: ClientBusinessSettings;
  store: ClientDataStore;
  syncService: ReturnType<typeof createClientSyncService>;
  terminalContext: ClientTerminalContext;
};

export const PosContext = createContext<PosContextValue | null>(null);

export const PosProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const [terminal, setTerminal] = useState<ClientRemoteTerminalSummary | null>(null);
  const [bundle, setBundle] = useState<TerminalBundle | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    const session = auth.session;
    if (!session || !terminal) {
      return;
    }

    let cancelled = false;

    void prepareTerminalBundle(session, terminal)
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
  }, [auth.session, terminal]);

  const backToLogin = () => {
    setTerminal(null);
    setBundle(null);
    setSetupError(null);
    auth.logout();
  };

  if (!auth.session) {
    return <CashierLoginScreen error={auth.error} onSubmit={auth.login} submitting={auth.status === 'submitting'} />;
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
