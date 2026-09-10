import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzlePaymentGatewayCredentialRepository } from '../src/modules/payment-gateways/drizzle-payment-gateway-credential.repository.js';
import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('DrizzlePaymentGatewayCredentialRepository', () => {
  let businessId: string;
  let otherBusinessId: string;
  let close: () => Promise<void>;
  let repository: DrizzlePaymentGatewayCredentialRepository;

  beforeEach(async () => {
    const database = await createMemoryDatabase();
    close = database.close;
    repository = new DrizzlePaymentGatewayCredentialRepository(database.db);

    const tenantRepository = new DrizzleTenantCoreRepository(database.db);
    await tenantRepository.createTenant({ id: tenantId, name: 'Tenant A', slug: 'tenant-a' });
    const business = await tenantRepository.createBusiness({ code: 'STORE-A', name: 'Store A', tenantId });
    const otherBusiness = await tenantRepository.createBusiness({ code: 'STORE-B', name: 'Store B', tenantId });

    businessId = business.id;
    otherBusinessId = otherBusiness.id;
  }, 20000);

  afterEach(async () => {
    await close();
  });

  it('finds no credential before one is ever saved', async () => {
    const found = await repository.findCredential(tenantId, businessId, 'razorpay');
    expect(found).toBeNull();
  });

  it('upserts a credential and updates it in place on a second save', async () => {
    const created = await repository.upsertCredential({
      businessId,
      encryptedCredentials: 'cipher-v1',
      gatewayCode: 'razorpay',
      isEnabled: true,
      tenantId
    });
    expect(created.isEnabled).toBe(true);

    const updated = await repository.upsertCredential({
      businessId,
      encryptedCredentials: 'cipher-v2',
      gatewayCode: 'razorpay',
      isEnabled: false,
      tenantId
    });

    expect(updated.id).toBe(created.id);
    expect(updated.encryptedCredentials).toBe('cipher-v2');
    expect(updated.isEnabled).toBe(false);

    const found = await repository.findCredential(tenantId, businessId, 'razorpay');
    expect(found?.encryptedCredentials).toBe('cipher-v2');
  });

  it('scopes credentials per business — one business cannot see another business\'s row', async () => {
    await repository.upsertCredential({
      businessId,
      encryptedCredentials: 'cipher-a',
      gatewayCode: 'razorpay',
      isEnabled: true,
      tenantId
    });

    const otherFound = await repository.findCredential(tenantId, otherBusinessId, 'razorpay');
    expect(otherFound).toBeNull();

    const listA = await repository.listCredentials(tenantId, businessId);
    const listB = await repository.listCredentials(tenantId, otherBusinessId);
    expect(listA).toHaveLength(1);
    expect(listB).toHaveLength(0);
  });
});
