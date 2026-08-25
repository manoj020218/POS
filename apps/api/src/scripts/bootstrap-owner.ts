import { loadBootstrapOwnerEnv } from '../config/bootstrap-owner-env.js';
import { loadWorkspaceEnv } from '../config/load-workspace-env.js';
import { createDatabase } from '../db/client.js';
import { createAuthAuditLogger } from '../modules/auth/auth-audit.service.js';
import { bootstrapOwnerUser } from '../modules/auth/bootstrap-owner.service.js';
import { DrizzleAuthRepository } from '../modules/auth/drizzle-auth.repository.js';

const run = async () => {
  loadWorkspaceEnv();
  const env = loadBootstrapOwnerEnv();
  const database = createDatabase(env.databaseUrl);
  const repository = new DrizzleAuthRepository(database.db);
  const auditLogger = createAuthAuditLogger(repository);

  try {
    const result = await bootstrapOwnerUser(repository, auditLogger, {
      displayName: env.displayName,
      email: env.email,
      password: env.password,
      role: env.role,
      tenantId: env.tenantId,
      userId: env.userId
    });

    console.log(
      JSON.stringify(
        {
          action: result.action,
          email: result.user.email,
          id: result.user.id,
          role: result.user.role,
          tenantId: result.user.tenantId
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
