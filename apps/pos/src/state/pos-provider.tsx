import { createContext, useEffect, useState, type ReactNode } from 'react';
import type {
  ClientBusinessSettings,
  ClientDataStore,
  ClientTerminalContext,
  createLocalCheckoutService
} from '@smart-pos/client-data';

import { demoTerminalContext } from '../lib/demo-context.js';
import { createSeededPosStore } from '../data/seed-store.js';

export type PosContextValue = {
  checkoutService: ReturnType<typeof createLocalCheckoutService>;
  settings: ClientBusinessSettings;
  store: ClientDataStore;
  terminalContext: ClientTerminalContext;
};

export const PosContext = createContext<PosContextValue | null>(null);

export const PosProvider = ({ children }: { children: ReactNode }) => {
  const [value, setValue] = useState<PosContextValue | null>(null);

  useEffect(() => {
    let cancelled = false;

    void createSeededPosStore().then(async ({ checkoutService, store }) => {
      const settings = await store.settings.findBusinessSettings(demoTerminalContext.businessId);
      if (!cancelled && settings) {
        setValue({ checkoutService, settings, store, terminalContext: demoTerminalContext });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!value) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
          <p className="text-sm font-medium text-ink-muted">Starting kiosk…</p>
        </div>
      </div>
    );
  }

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
};
