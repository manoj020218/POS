import { randomUUID } from 'node:crypto';

import { createApp } from '../app.js';
import { createLogger } from '../lib/logger.js';
import { InMemoryAuthRepository } from '../modules/auth/in-memory-auth.repository.js';
import { hashPassword } from '../modules/auth/password.js';
import { InMemoryCatalogRepository } from '../modules/catalog/in-memory-catalog.repository.js';
import { InMemoryTenantCoreRepository } from '../modules/tenant-core/in-memory-tenant-core.repository.js';
import { seedDevCatalog } from './seed-dev-catalog.js';

const port = Number(process.env.PORT ?? 4000);

const run = async () => {
  const logger = createLogger('info');
  const authRepository = new InMemoryAuthRepository();
  const tenantCoreRepository = new InMemoryTenantCoreRepository();
  const catalogRepository = new InMemoryCatalogRepository();

  const tenant = await tenantCoreRepository.createTenant({
    id: randomUUID(),
    name: 'Dev Tenant',
    slug: 'dev-tenant'
  });
  const business = await tenantCoreRepository.createBusiness({
    code: 'DEMO',
    name: 'Smart POS Demo Store',
    tenantId: tenant.id
  });
  const branch = await tenantCoreRepository.createBranch({
    address: '12 MG Road, Bengaluru',
    businessId: business.id,
    code: 'MAIN',
    name: 'Main Branch',
    tenantId: tenant.id
  });
  const terminals = await Promise.all([
    tenantCoreRepository.registerTerminal({
      branchId: branch.id,
      code: 'T1',
      name: 'Counter 1',
      tenantId: tenant.id
    }),
    tenantCoreRepository.registerTerminal({
      branchId: branch.id,
      code: 'T2',
      name: 'Counter 2',
      tenantId: tenant.id
    })
  ]);

  const email = 'asha@example.com';
  const password = 'Password123';
  const cashierId = randomUUID();
  await authRepository.upsertUser({
    displayName: 'Asha Rao',
    email,
    id: cashierId,
    isActive: true,
    passwordHash: await hashPassword(password),
    permissions: [],
    role: 'CASHIER',
    tenantId: tenant.id
  });
  await authRepository.replaceBranchAccessForUser(cashierId, tenant.id, [branch.id]);
  await seedDevCatalog({ businessId: business.id, catalogRepository, tenantId: tenant.id });

  const app = createApp({ authRepository, catalogRepository, logger, tenantCoreRepository });

  app.listen(port, () => {
    console.log(
      JSON.stringify(
        {
          branchId: branch.id,
          businessId: business.id,
          email,
          note: 'In-memory dev server — data resets on restart. Not for production use.',
          password,
          port,
          tenantId: tenant.id,
          terminalIds: terminals.map((terminal) => terminal.id)
        },
        null,
        2
      )
    );
  });
};

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
