import { createInMemoryClientDataStore, createLocalCheckoutService } from '@smart-pos/client-data';

import { buildSeedCustomers } from './seed-customers.js';
import { buildSeedProducts } from './seed-products.js';
import { buildSeedSettings } from './seed-settings.js';
import type { SeedBusinessContext } from './seed-context.js';

export const createSeededPosStore = async (business: SeedBusinessContext) => {
  const store = createInMemoryClientDataStore();

  await store.products.upsertProducts(buildSeedProducts(business));
  await store.customers.upsertCustomers(buildSeedCustomers(business));
  await store.settings.saveBusinessSettings(buildSeedSettings(business));

  const checkoutService = createLocalCheckoutService({ store });

  return { checkoutService, store };
};
