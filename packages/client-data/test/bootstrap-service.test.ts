import { describe, expect, it } from 'vitest';

import {
  createClientBootstrapService,
  createInMemoryClientDataStore,
  type ClientRemoteApi
} from '../src/index.js';
import { createSettings } from './fixtures.js';

describe('createClientBootstrapService', () => {
  it('refreshes business settings from the remote API into the local store', async () => {
    const store = createInMemoryClientDataStore();
    const settings = createSettings();
    const remoteApi: ClientRemoteApi = {
      getBusinessSettings: async () => settings,
      listBranches: async () => [],
      listTerminals: async () => [],
      pullChanges: async () => ({ changes: [], nextCursor: null, serverTime: '2026-08-29T12:00:00.000Z' }),
      pushEvents: async () => ({ acceptedCount: 0, duplicateCount: 0, events: [] })
    };

    const service = createClientBootstrapService({ remoteApi, store });
    const result = await service.refreshBusinessSettings({ businessId: settings.businessId });
    const stored = await store.settings.findBusinessSettings(settings.businessId);

    expect(result).toEqual(settings);
    expect(stored).toEqual(settings);
  });
});
