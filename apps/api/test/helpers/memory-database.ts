import { readFileSync } from 'node:fs';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import type { AppDatabase } from '../../src/db/client.js';
import * as schema from '../../src/db/schema/index.js';

const migrationPath = new URL('../../drizzle/0000_damp_loners.sql', import.meta.url);

export const createMemoryDatabase = async () => {
  const sql = readFileSync(migrationPath, 'utf8');
  const client = new PGlite();

  await client.exec(sql);

  return {
    close: async () => {
      await client.close();
    },
    db: drizzle(client, { schema }) as unknown as AppDatabase
  };
};
