import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleSupplierRepository } from '../src/modules/supplier/drizzle-supplier.repository.js';
import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

const tenantA = '11111111-1111-4111-8111-111111111111';

describe('DrizzleSupplierRepository', () => {
  let close: () => Promise<void>;
  let database: Awaited<ReturnType<typeof createMemoryDatabase>>;

  beforeEach(async () => {
    database = await createMemoryDatabase();
    close = database.close;
  }, 20000);

  afterEach(async () => {
    await close();
  });

  it('persists, queries, and updates business-scoped suppliers', async () => {
    const tenantRepository = new DrizzleTenantCoreRepository(database.db);
    const repository = new DrizzleSupplierRepository(database.db);

    await tenantRepository.createTenant({ id: tenantA, name: 'Tenant A', slug: 'tenant-a' });
    const businessA = await tenantRepository.createBusiness({
      code: 'STORE-A',
      name: 'Store A',
      tenantId: tenantA
    });
    const businessB = await tenantRepository.createBusiness({
      code: 'STORE-B',
      name: 'Store B',
      tenantId: tenantA
    });

    const supplierA = await repository.createSupplier({
      businessId: businessA.id,
      isActive: true,
      mobile: '9000000001',
      name: 'Acme Supply',
      tenantId: tenantA
    });
    await repository.createSupplier({
      businessId: businessB.id,
      isActive: true,
      name: 'Branch B Supplier',
      tenantId: tenantA
    });
    const updated = await repository.updateSupplier(supplierA.id, tenantA, {
      notes: 'priority',
      taxNumber: 'GST-123'
    });

    await expect(repository.findSupplierById(supplierA.id)).resolves.toMatchObject({
      id: supplierA.id,
      name: 'Acme Supply'
    });
    await expect(repository.listSuppliers(tenantA, [businessA.id], 'Acme')).resolves.toEqual([
      expect.objectContaining({
        id: supplierA.id,
        name: 'Acme Supply'
      })
    ]);
    expect(updated).toMatchObject({
      id: supplierA.id,
      notes: 'priority',
      taxNumber: 'GST-123'
    });
  });
});
