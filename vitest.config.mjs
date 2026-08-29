import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['apps/api/test/**/*.test.ts', 'packages/*/test/**/*.test.ts'],
    testTimeout: 15000
  }
});
