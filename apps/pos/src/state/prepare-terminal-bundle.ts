import {
  createClientBootstrapService,
  createClientSyncService,
  createHttpClientRemoteApi,
  createIndexedDbClientDataStore,
  createLocalCheckoutService,
  type ClientAuthResult,
  type ClientRemoteTerminalSummary
} from '@smart-pos/client-data';

import { apiBaseUrl } from '../lib/api-config.js';
import { createPosPrinterService } from '../lib/printer/create-printer-service.js';
import { buildTerminalContext } from './build-terminal-context.js';

export type TerminalSessionAccess = {
  getAccessToken: () => string;
  refreshAccessToken: () => Promise<string | null>;
};

export const prepareTerminalBundle = async (
  session: ClientAuthResult,
  terminal: ClientRemoteTerminalSummary,
  sessionAccess: TerminalSessionAccess
) => {
  const remoteApi = createHttpClientRemoteApi({
    baseUrl: apiBaseUrl,
    getAccessToken: sessionAccess.getAccessToken,
    onUnauthorized: sessionAccess.refreshAccessToken
  });
  const store = await createIndexedDbClientDataStore();
  const bootstrapService = createClientBootstrapService({ remoteApi, store });
  const syncService = createClientSyncService({ remoteApi, store });

  const settings = await bootstrapService.refreshBusinessSettings();
  const terminalContext = buildTerminalContext({ settings, terminal, user: session.user });

  await syncService.syncNow({ branchId: terminalContext.branchId, limit: 100 });

  return {
    checkoutService: createLocalCheckoutService({ printerService: createPosPrinterService(), store }),
    refreshBusinessSettings: bootstrapService.refreshBusinessSettings,
    remoteApi,
    settings,
    store,
    syncService,
    terminalContext
  };
};

export type TerminalBundle = Awaited<ReturnType<typeof prepareTerminalBundle>>;
