import { describe, expect, it } from 'vitest';

import { createClientBootstrapService, createInMemoryClientDataStore, type ClientRemoteApi } from '../src/index.js';
import { createSettings, createUnusedRemoteApi } from './fixtures.js';

describe('createClientBootstrapService', () => {
  it('refreshes business settings from the remote API into the local store', async () => {
    const store = createInMemoryClientDataStore();
    const settings = createSettings();
    const remoteApi: ClientRemoteApi = {
      ...createUnusedRemoteApi(),
      getBusinessSettings: async () => settings,
      updateBusinessSettings: async () => settings
    };

    const service = createClientBootstrapService({ remoteApi, store });
    const result = await service.refreshBusinessSettings({ businessId: settings.businessId });
    const stored = await store.settings.findBusinessSettings(settings.businessId);

    expect(result).toEqual(settings);
    expect(stored).toEqual(settings);
  });
});
