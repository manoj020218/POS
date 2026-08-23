import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

const tenantA = '11111111-1111-4111-8111-111111111111';
const tenantB = '22222222-2222-4222-8222-222222222222';

describe('DrizzleTenantCoreRepository', () => {
  let close: () => Promise<void>;
  let repository: DrizzleTenantCoreRepository;

  beforeEach(async () => {
    const database = await createMemoryDatabase();

    close = database.close;
    repository = new DrizzleTenantCoreRepository(database.db);

    await repository.createTenant({ id: tenantA, name: 'Tenant A', slug: 'tenant-a' });
    await repository.createTenant({ id: tenantB, name: 'Tenant B', slug: 'tenant-b' });
  }, 20000);

  afterEach(async () => {
    await close();
  });

  it('persists business and branch records with tenant scoping', async () => {
    const businessA = await repository.createBusiness({
      code: 'HQ01',
      name: 'Head Office',
      tenantId: tenantA
    });
    const businessB = await repository.createBusiness({
      code: 'HQ01',
      name: 'Other Tenant Office',
      tenantId: tenantB
    });

    await repository.createBranch({
      address: 'A Street',
      businessId: businessA.id,
      code: 'BR-A',
      name: 'Alpha Branch',
      tenantId: tenantA
    });
    await repository.createBranch({
      address: 'B Street',
      businessId: businessB.id,
      code: 'BR-B',
      name: 'Bravo Branch',
      tenantId: tenantB
    });

    const branches = await repository.listBranches(tenantA);

    expect(branches).toHaveLength(1);
    expect(branches[0]).toBeDefined();
    expect(branches[0]!.tenantId).toBe(tenantA);
    expect(branches[0]!.name).toBe('Alpha Branch');
  });

  it('enforces unique business codes per tenant at the database layer', async () => {
    await repository.createBusiness({
      code: 'POS01',
      name: 'Main',
      tenantId: tenantA
    });

    await expect(
      repository.createBusiness({
        code: 'POS01',
        name: 'Duplicate',
        tenantId: tenantA
      })
    ).rejects.toMatchObject({
      code: 'DUPLICATE_CODE',
      statusCode: 409
    });
  });

  it('registers and disables terminals using persisted branch ownership', async () => {
    const business = await repository.createBusiness({
      code: 'STORE1',
      name: 'Store 1',
      tenantId: tenantA
    });
    const branch = await repository.createBranch({
      address: 'Market Road',
      businessId: business.id,
      code: 'MAIN',
      name: 'Main Branch',
      tenantId: tenantA
    });

    const terminal = await repository.registerTerminal({
      branchId: branch.id,
      code: 'POS-01',
      deviceInstallationId: 'android-tab-01',
      name: 'Front Counter',
      tenantId: tenantA
    });
    const disabled = await repository.disableTerminal(tenantA, terminal.id);

    expect(disabled.isActive).toBe(false);

    const terminals = await repository.listTerminals(tenantA, branch.id);
    expect(terminals).toHaveLength(1);
    expect(terminals[0]).toBeDefined();
    expect(terminals[0]!.deviceInstallationId).toBe('android-tab-01');
  });

  it('rejects cross-tenant updates for existing records', async () => {
    const business = await repository.createBusiness({
      code: 'CROSS1',
      name: 'Cross Tenant Store',
      tenantId: tenantA
    });

    await expect(
      repository.updateBusiness(tenantB, business.id, {
        name: 'Should Fail'
      })
    ).rejects.toMatchObject({
      code: 'BUSINESS_NOT_FOUND',
      statusCode: 404
    });
  });
});
