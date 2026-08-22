import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';

import * as schema from './schema/index.js';

export type AppDatabase = NodePgDatabase<typeof schema>;

export const createDatabase = (databaseUrl: string) => {
  const poolConfig: PoolConfig = {
    connectionString: databaseUrl,
    max: 10
  };
  const pool = new Pool(poolConfig);

  return createDatabaseFromPool(pool);
};

export const createDatabaseFromPool = (pool: Pool) => {
  return {
    db: drizzle(pool, { schema }),
    close: async () => {
      await pool.end();
    }
  };
};
