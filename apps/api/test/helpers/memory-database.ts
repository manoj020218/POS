import { readFileSync } from 'node:fs';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import type { AppDatabase } from '../../src/db/client.js';
import * as schema from '../../src/db/schema/index.js';

const journalPath = new URL('../../drizzle/meta/_journal.json', import.meta.url);

type MigrationJournal = {
  entries: Array<{ tag: string }>;
};

export const createMemoryDatabase = async () => {
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as MigrationJournal;
  const client = new PGlite();

  for (const entry of journal.entries) {
    const migrationPath = new URL(`../../drizzle/${entry.tag}.sql`, import.meta.url);
    await client.exec(readFileSync(migrationPath, 'utf8'));
  }

  return {
    close: async () => {
      await client.close();
    },
    db: drizzle(client, { schema }) as unknown as AppDatabase
  };
};
