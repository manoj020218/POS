import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleCustomerRepository } from '../src/modules/customer/drizzle-customer.repository.js';
import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

const tenantA = '11111111-1111-4111-8111-111111111111';
const tenantB = '22222222-2222-4222-8222-222222222222';

describe('DrizzleCustomerRepository', () => {
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
    await tenantRepository.createTenant({ id: tenantB, name: 'Tenant B', slug: 'tenant-b' });
    businessA1 = (
      await tenantRepository.createBusiness({ code: 'STORE-A', name: 'Store A', tenantId: tenantA })
    ).id;
    businessA2 = (
      await tenantRepository.createBusiness({ code: 'STORE-B', name: 'Store B', tenantId: tenantA })
    ).id;
    await tenantRepository.createBusiness({ code: 'STORE-C', name: 'Store C', tenantId: tenantB });
  }, 20000);

  afterEach(async () => {
    await close();
  });

  it('persists and updates business-scoped customers with walk-in lookup and query filtering', async () => {
    const walkIn = await repository.createCustomer({
      businessId: businessA1,
      isActive: true,
      isWalkIn: true,
      name: 'Walk-in Customer',
      tenantId: tenantA
    });
    const customer = await repository.createCustomer({
      businessId: businessA1,
      email: 'alice@example.com',
      isActive: true,
      isWalkIn: false,
      mobile: '9876543210',
      name: 'Alice',
      tenantId: tenantA
    });

    const updated = await repository.updateCustomer(customer.id, tenantA, {
      notes: 'priority',
      taxNumber: 'GSTIN123'
    });
    const listed = await repository.listCustomers(tenantA, [businessA1]);
    const queried = await repository.listCustomers(tenantA, [businessA1], '9876543210');
    const foundWalkIn = await repository.findWalkInCustomer(tenantA, businessA1);

    expect(updated).toMatchObject({
      notes: 'priority',
      taxNumber: 'GSTIN123'
    });
    expect(listed.map((item) => item.id)).toEqual([walkIn.id, customer.id]);
    expect(queried).toHaveLength(1);
    expect(queried[0]?.id).toBe(customer.id);
    expect(foundWalkIn?.id).toBe(walkIn.id);
  });

  it('respects business scope when listing customers', async () => {
    await repository.createCustomer({
      businessId: businessA1,
      isActive: true,
      isWalkIn: false,
      name: 'Store A Customer',
      tenantId: tenantA
    });
    await repository.createCustomer({
      businessId: businessA2,
      isActive: true,
      isWalkIn: false,
      name: 'Store B Customer',
      tenantId: tenantA
    });

    const scoped = await repository.listCustomers(tenantA, [businessA1]);

    expect(scoped).toHaveLength(1);
    expect(scoped[0]?.businessId).toBe(businessA1);
    expect(scoped[0]?.name).toBe('Store A Customer');
  });
});
