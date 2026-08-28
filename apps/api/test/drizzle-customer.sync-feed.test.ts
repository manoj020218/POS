import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleCustomerRepository } from '../src/modules/customer/drizzle-customer.repository.js';
import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { buildCustomerSyncPullChangeKey } from '../src/modules/sync/sync-pull-cursor.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

const tenantA = '11111111-1111-4111-8111-111111111111';

describe('DrizzleCustomerRepository sync feed', () => {
  let businessA1: string;
  let businessA2: string;
  let close: () => Promise<void>;
  let repository: DrizzleCustomerRepository;

  beforeEach(async () => {
    const database = await createMemoryDatabase();
    const tenantRepository = new DrizzleTenantCoreRepository(database.db);

    close = database.close;
    repository = new DrizzleCustomerRepository(database.db);

    await tenantRepository.createTenant({ id: tenantA, name: 'Tenant A', slug: 'tenant-a' });
    businessA1 = (
      await tenantRepository.createBusiness({ code: 'STORE-A', name: 'Store A', tenantId: tenantA })
    ).id;
    businessA2 = (
      await tenantRepository.createBusiness({ code: 'STORE-B', name: 'Store B', tenantId: tenantA })
    ).id;
  }, 20000);

  afterEach(async () => {
    await close();
  });

  it('lists updated customers by business scope and pull cursor order', async () => {
    const first = await repository.createCustomer({
      businessId: businessA1,
      isActive: true,
      isWalkIn: false,
      name: 'Alice',
      tenantId: tenantA
    });
    const second = await repository.createCustomer({
      businessId: businessA1,
      isActive: true,
      isWalkIn: false,
      name: 'Bob',
      tenantId: tenantA
    });

    await repository.createCustomer({
      businessId: businessA2,
      isActive: true,
      isWalkIn: false,
      name: 'Other Business Customer',
      tenantId: tenantA
    });
    await repository.updateCustomer(first.id, tenantA, { notes: 'priority' });

    const firstPage = await repository.listCustomersUpdatedSince(tenantA, [businessA1], { limit: 1 });
    const secondPage = await repository.listCustomersUpdatedSince(tenantA, [businessA1], {
      cursor: {
        changeKey: buildCustomerSyncPullChangeKey(firstPage[0]!.id),
        updatedAt: firstPage[0]!.updatedAt
      },
      limit: 10
    });
    const otherBusiness = await repository.listCustomersUpdatedSince(tenantA, [businessA2], {
      limit: 10
    });

    expect(firstPage.map((customer) => customer.id)).toEqual([second.id]);
    expect(secondPage).toEqual([expect.objectContaining({ id: first.id, notes: 'priority' })]);
    expect(otherBusiness).toEqual([expect.objectContaining({ name: 'Other Business Customer' })]);
  });
});
