import { createInMemoryClientDataStore, createLocalCheckoutService } from '@smart-pos/client-data';

import { buildSeedCustomers } from './seed-customers.js';
import { buildSeedProducts } from './seed-products.js';
import { buildSeedSettings } from './seed-settings.js';

export const createSeededPosStore = async () => {
  const store = createInMemoryClientDataStore();

  await store.products.upsertProducts(buildSeedProducts());
  await store.customers.upsertCustomers(buildSeedCustomers());
  await store.settings.saveBusinessSettings(buildSeedSettings());

  const checkoutService = createLocalCheckoutService({ store });

  return { checkoutService, store };
};
