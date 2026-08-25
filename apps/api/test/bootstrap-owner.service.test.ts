import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAuthAuditLogger } from '../src/modules/auth/auth-audit.service.js';
import { bootstrapOwnerUser } from '../src/modules/auth/bootstrap-owner.service.js';
import { DrizzleAuthRepository } from '../src/modules/auth/drizzle-auth.repository.js';
import { verifyPassword } from '../src/modules/auth/password.js';
import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

describe('bootstrapOwnerUser', () => {
  let close: () => Promise<void>;
  let repository: DrizzleAuthRepository;
  let tenantRepository: DrizzleTenantCoreRepository;

  beforeEach(async () => {
    const database = await createMemoryDatabase();

    close = database.close;
    repository = new DrizzleAuthRepository(database.db);
    tenantRepository = new DrizzleTenantCoreRepository(database.db);
    await tenantRepository.createTenant({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Tenant A',
      slug: 'tenant-a'
    });
  }, 20000);

  afterEach(async () => {
    await close();
  }, 20000);

  it('creates an initial bootstrap owner and audits the creation', async () => {
    const auditLogger = createAuthAuditLogger(repository);
    const result = await bootstrapOwnerUser(repository, auditLogger, {
      displayName: 'Tenant Owner',
      email: 'owner@example.com',
      password: 'Password123',
      role: 'BUSINESS_OWNER',
      tenantId: '11111111-1111-4111-8111-111111111111'
    });
    const logs = await repository.listAuditLogsForEntity(
      '11111111-1111-4111-8111-111111111111',
      'auth_user',
      result.user.id
    );

    expect(result.action).toBe('created');
    expect(result.user.role).toBe('BUSINESS_OWNER');
    expect(await verifyPassword('Password123', result.user.passwordHash)).toBe(true);
    expect(logs[0]!).toMatchObject({
      action: 'AUTH_USER_CREATED',
      entityId: result.user.id,
      metadata: {
        isActive: true,
        role: 'BUSINESS_OWNER',
        source: 'bootstrap_owner'
      }
    });
  });

  it('is idempotent when rerun with the same bootstrap owner values', async () => {
    const auditLogger = createAuthAuditLogger(repository);
    const first = await bootstrapOwnerUser(repository, auditLogger, {
      displayName: 'Tenant Owner',
      email: 'owner@example.com',
      password: 'Password123',
      role: 'BUSINESS_OWNER',
      tenantId: '11111111-1111-4111-8111-111111111111'
    });
    const second = await bootstrapOwnerUser(repository, auditLogger, {
      displayName: 'Tenant Owner',
      email: 'owner@example.com',
      password: 'Password123',
      role: 'BUSINESS_OWNER',
      tenantId: '11111111-1111-4111-8111-111111111111'
    });
    const logs = await repository.listAuditLogsForEntity(
      '11111111-1111-4111-8111-111111111111',
      'auth_user',
      first.user.id
    );

    expect(second.action).toBe('unchanged');
    expect(second.user.id).toBe(first.user.id);
    expect(logs).toHaveLength(1);
  });

  it('updates an existing bootstrap user and audits the update', async () => {
    const auditLogger = createAuthAuditLogger(repository);
    const created = await bootstrapOwnerUser(repository, auditLogger, {
      displayName: 'Tenant Owner',
      email: 'owner@example.com',
      password: 'Password123',
      role: 'BUSINESS_OWNER',
      tenantId: '11111111-1111-4111-8111-111111111111',
      userId: '99999999-9999-4999-8999-999999999999'
    });
    await repository.upsertUser({
      ...created.user,
      isActive: false,
      role: 'BUSINESS_ADMIN'
    });
    const updated = await bootstrapOwnerUser(repository, auditLogger, {
      displayName: 'Primary Owner',
      email: 'owner@example.com',
      password: 'Password456',
      role: 'BUSINESS_OWNER',
      tenantId: '11111111-1111-4111-8111-111111111111',
      userId: '99999999-9999-4999-8999-999999999999'
    });
    const logs = await repository.listAuditLogsForEntity(
      '11111111-1111-4111-8111-111111111111',
      'auth_user',
      created.user.id
    );

    expect(updated.action).toBe('updated');
    expect(updated.user.displayName).toBe('Primary Owner');
    expect(updated.user.isActive).toBe(true);
    expect(updated.user.role).toBe('BUSINESS_OWNER');
    expect(await verifyPassword('Password456', updated.user.passwordHash)).toBe(true);
    expect(logs[1]!).toMatchObject({
      action: 'AUTH_USER_UPDATED',
      entityId: created.user.id,
      metadata: expect.objectContaining({
        changedFields: ['displayName', 'role', 'isActive'],
        nextRole: 'BUSINESS_OWNER',
        previousRole: 'BUSINESS_ADMIN',
        source: 'bootstrap_owner'
      })
    });
  });

  it('rejects a bootstrap owner email collision across tenants', async () => {
    const auditLogger = createAuthAuditLogger(repository);
    await tenantRepository.createTenant({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Tenant B',
      slug: 'tenant-b'
    });
    await bootstrapOwnerUser(repository, auditLogger, {
      displayName: 'Tenant Owner',
      email: 'owner@example.com',
      password: 'Password123',
      role: 'BUSINESS_OWNER',
      tenantId: '11111111-1111-4111-8111-111111111111'
    });

    await expect(
      bootstrapOwnerUser(repository, auditLogger, {
        displayName: 'Other Owner',
        email: 'owner@example.com',
        password: 'Password123',
        role: 'BUSINESS_OWNER',
        tenantId: '22222222-2222-4222-8222-222222222222'
      })
    ).rejects.toMatchObject({
      code: 'AUTH_BOOTSTRAP_EMAIL_IN_USE',
      statusCode: 409
    });
  });
});
