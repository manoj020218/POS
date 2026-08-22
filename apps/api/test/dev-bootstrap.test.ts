import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { bootstrapDevelopmentTenant } from '../src/modules/tenant-core/dev-bootstrap.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

describe('bootstrapDevelopmentTenant', () => {
  let close: () => Promise<void>;
  let db: Awaited<ReturnType<typeof createMemoryDatabase>>['db'];
  let repository: DrizzleTenantCoreRepository;

  beforeEach(async () => {
    const database = await createMemoryDatabase();

    close = database.close;
    db = database.db;
    repository = new DrizzleTenantCoreRepository(db);
  });

  afterEach(async () => {
    await close();
  });

  it('creates a full development hierarchy on first run', async () => {
    const result = await bootstrapDevelopmentTenant(db, repository, {
      branchAddress: 'Main Road',
      branchCode: 'main-branch',
      branchName: 'Main Branch',
      businessCode: 'hq01',
      businessName: 'Head Office',
      tenantId: '11111111-1111-4111-8111-111111111111',
      tenantName: 'Dev Tenant',
      terminalCode: 'pos-01',
      terminalInstallationId: 'android-tab-01',
      terminalName: 'Front Counter'
    });

    expect(result.created).toEqual(['tenant', 'business', 'branch', 'terminal']);
    expect(result.tenant.slug).toBe('dev-tenant');
    expect(result.business?.code).toBe('HQ01');
    expect(result.branch?.code).toBe('MAIN-BRANCH');
    expect(result.terminal?.code).toBe('POS-01');
  });

  it('is idempotent when rerun with the same bootstrap values', async () => {
    const input = {
      branchCode: 'main-branch',
      branchName: 'Main Branch',
      businessCode: 'hq01',
      businessName: 'Head Office',
      tenantId: '11111111-1111-4111-8111-111111111111',
      tenantName: 'Dev Tenant',
      tenantSlug: 'dev-tenant',
      terminalCode: 'pos-01',
      terminalName: 'Front Counter'
    };

    await bootstrapDevelopmentTenant(db, repository, input);
    const rerun = await bootstrapDevelopmentTenant(db, repository, input);

    expect(rerun.created).toEqual([]);
    expect(rerun.business).toBeDefined();
    expect(rerun.branch).toBeDefined();
    expect(rerun.terminal).toBeDefined();
  });

  it('rejects a slug collision for a different tenant id', async () => {
    await bootstrapDevelopmentTenant(db, repository, {
      tenantId: '11111111-1111-4111-8111-111111111111',
      tenantName: 'Tenant Alpha',
      tenantSlug: 'shared-tenant'
    });

    await expect(
      bootstrapDevelopmentTenant(db, repository, {
        tenantId: '22222222-2222-4222-8222-222222222222',
        tenantName: 'Tenant Bravo',
        tenantSlug: 'shared-tenant'
      })
    ).rejects.toMatchObject({
      code: 'TENANT_SLUG_CONFLICT',
      statusCode: 409
    });
  });
});
