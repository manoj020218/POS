import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { createLogger } from '../src/lib/logger.js';

const authConfig = {
  jwtSecret: 'test-jwt-secret-0123456789-abcdefgh',
  refreshSecret: 'test-refresh-secret-0123456789-ab'
};
const bridgeSharedSecret = 'test-bridge-secret-0123456789-abcd';

const validPayload = {
  address: '12 MG Road',
  businessName: 'Sharma Kirana Store',
  city: 'Bengaluru',
  email: 'owner@example.com',
  mobile: '+919876543210',
  ownerName: 'Ramesh Sharma'
};

describe('POST /api/bridge/provision', () => {
  const buildApp = () => createApp({ authConfig, bridgeSharedSecret, logger: createLogger('silent') });

  it('rejects a request with a missing bridge secret', async () => {
    const app = buildApp();
    const response = await request(app).post('/api/bridge/provision').send(validPayload);

    expect(response.status).toBe(401);
  });

  it('rejects a request with the wrong bridge secret', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/bridge/provision')
      .set('X-Bridge-Secret', 'wrong-secret')
      .send(validPayload);

    expect(response.status).toBe(401);
  });

  it('provisions a new tenant/business/branch/terminal/owner and returns a temp password that logs in', async () => {
    const app = buildApp();
    const response = await request(app)
      .post('/api/bridge/provision')
      .set('X-Bridge-Secret', bridgeSharedSecret)
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      businessCode: 'SHARMA-KIRANA-STORE',
      ownerEmail: 'owner@example.com'
    });
    expect(response.body.data.tenantId).toBeTruthy();
    expect(response.body.data.businessId).toBeTruthy();
    expect(response.body.data.branchId).toBeTruthy();
    expect(response.body.data.terminalId).toBeTruthy();
    expect(response.body.data.tempPassword).toMatch(/^[A-Za-z0-9]{12}$/);

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validPayload.email, password: response.body.data.tempPassword });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data.user.role).toBe('BUSINESS_OWNER');
  });

  it('rejects a request missing a required field', async () => {
    const app = buildApp();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit it from withoutBusinessName
    const { businessName: _businessName, ...withoutBusinessName } = validPayload;
    const response = await request(app)
      .post('/api/bridge/provision')
      .set('X-Bridge-Secret', bridgeSharedSecret)
      .send(withoutBusinessName);

    expect(response.status).toBe(400);
  });

  it('rejects a second signup reusing the same owner email with a 409', async () => {
    const app = buildApp();
    await request(app).post('/api/bridge/provision').set('X-Bridge-Secret', bridgeSharedSecret).send(validPayload);

    const secondResponse = await request(app)
      .post('/api/bridge/provision')
      .set('X-Bridge-Secret', bridgeSharedSecret)
      .send({ ...validPayload, businessName: 'A Different Store' });

    expect(secondResponse.status).toBe(409);
  });
});
