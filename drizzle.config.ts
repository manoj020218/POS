import { defineConfig } from 'drizzle-kit';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/smart_pos';

export default defineConfig({
  out: './apps/api/drizzle',
  schema: './apps/api/src/db/schema/*.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl
  }
});
