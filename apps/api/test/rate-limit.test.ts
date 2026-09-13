import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createRateLimiter } from '../src/http/middleware/rate-limit.js';
import { errorHandler } from '../src/http/middleware/error-handler.js';
import { createLogger } from '../src/lib/logger.js';

// Uses skipInTest: false to actually exercise the limiter's behavior here —
// the exported authRateLimiter/apiRateLimiter singletons stay skipped for
// every other test in the suite (NODE_ENV=test), so this doesn't affect them.
const buildTestApp = (limit: number) => {
  const app = express();
  app.use(createRateLimiter(60_000, limit, 'Too many requests.', { skipInTest: false }));
  app.get('/ping', (_request, response) => response.json({ ok: true }));
  app.use(errorHandler(createLogger('silent')));
  return app;
};

describe('rate limiting', () => {
  it('allows requests under the limit', async () => {
    const app = buildTestApp(3);

    for (let i = 0; i < 3; i += 1) {
      const response = await request(app).get('/ping');
      expect(response.status).toBe(200);
    }
  });

  it('rejects requests once the limit is exceeded, with a 429 and RATE_LIMITED code', async () => {
    const app = buildTestApp(2);

    await request(app).get('/ping');
    await request(app).get('/ping');
    const blocked = await request(app).get('/ping');

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('RATE_LIMITED');
  });

  it('is a no-op in NODE_ENV=test unless skipInTest is explicitly disabled', async () => {
    const app = express();
    app.use(createRateLimiter(60_000, 1, 'Too many requests.'));
    app.get('/ping', (_request, response) => response.json({ ok: true }));
    app.use(errorHandler(createLogger('silent')));

    for (let i = 0; i < 5; i += 1) {
      const response = await request(app).get('/ping');
      expect(response.status).toBe(200);
    }
  });
});
