import 'dotenv/config';

import { loadBootstrapEnv } from '../config/bootstrap-env.js';
import { createDatabase } from '../db/client.js';
import { DrizzleTenantCoreRepository } from '../modules/tenant-core/drizzle-tenant-core.repository.js';
import { bootstrapDevelopmentTenant } from '../modules/tenant-core/dev-bootstrap.js';

const run = async () => {
  const env = loadBootstrapEnv();
  const database = createDatabase(env.DATABASE_URL);
  const repository = new DrizzleTenantCoreRepository(database.db);

  try {
    const result = await bootstrapDevelopmentTenant(database.db, repository, {
      branchAddress: env.DEV_BRANCH_ADDRESS,
      branchCode: env.DEV_BRANCH_CODE,
      branchName: env.DEV_BRANCH_NAME,
      businessCode: env.DEV_BUSINESS_CODE,
      businessName: env.DEV_BUSINESS_NAME,
      tenantId: env.DEV_TENANT_ID,
      tenantName: env.DEV_TENANT_NAME,
      tenantSlug: env.DEV_TENANT_SLUG,
      terminalCode: env.DEV_TERMINAL_CODE,
      terminalInstallationId: env.DEV_TERMINAL_INSTALLATION_ID,
      terminalName: env.DEV_TERMINAL_NAME
    });

    console.log(
      JSON.stringify(
        {
          branchId: result.branch?.id,
          businessId: result.business?.id,
          created: result.created,
          tenantId: result.tenant.id,
          tenantSlug: result.tenant.slug,
          terminalId: result.terminal?.id
        },
        null,
        2
      )
    );
  } finally {
    await database.close();
  }
};

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
