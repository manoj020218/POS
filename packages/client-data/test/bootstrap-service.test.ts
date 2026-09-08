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
      createProduct: async () => {
        throw new Error('unused');
      },
      getBusinessSettings: async () => settings,
      getProductPriceHistory: async () => [],
      listBranches: async () => [],
      listProducts: async () => ({ items: [], meta: { hasNextPage: false, page: 1, pageSize: 20, totalItems: 0, totalPages: 1 } }),
      listTerminals: async () => [],
      listUnits: async () => [],
      pullChanges: async () => ({ changes: [], nextCursor: null, serverTime: '2026-08-29T12:00:00.000Z' }),
      pushEvents: async () => ({ acceptedCount: 0, duplicateCount: 0, events: [] }),
      updateBusinessSettings: async () => settings,
      updateProduct: async () => {
        throw new Error('unused');
      },
      uploadProductImage: async () => {
        throw new Error('unused');
      }
    };

    const service = createClientBootstrapService({ remoteApi, store });
    const result = await service.refreshBusinessSettings({ businessId: settings.businessId });
    const stored = await store.settings.findBusinessSettings(settings.businessId);

    expect(result).toEqual(settings);
    expect(stored).toEqual(settings);
  });
});
