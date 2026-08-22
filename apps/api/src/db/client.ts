import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema/index.js';

export const createDatabase = (databaseUrl: string) => {
  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false
  });

  return {
    db: drizzle(sql, { schema }),
    close: async () => {
      await sql.end();
    }
  };
};
