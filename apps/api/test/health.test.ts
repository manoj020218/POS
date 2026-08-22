import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { createLogger } from '../src/lib/logger.js';

describe('GET /health', () => {
  it('returns status ok', async () => {
    const app = createApp({
      logger: createLogger('silent')
    });
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok'
    });
  });
});
