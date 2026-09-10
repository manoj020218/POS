import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('payment gateway credential routes', () => {
  it('lists the razorpay card as not configured until credentials are saved, gated behind settings:manage', async () => {
    const { app, businessAId, loginAs } = await createCatalogTestContext();
    const ownerAccess = await loginAs('owner@example.com');
    const managerAccess = await loginAs('manager@example.com');

    const deniedList = await request(app)
      .get('/api/v1/payment-gateways')
      .query({ businessId: businessAId })
      .set(managerAccess);
    expect(deniedList.status).toBe(403);

    const list = await request(app)
      .get('/api/v1/payment-gateways')
      .query({ businessId: businessAId })
      .set(ownerAccess);
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([
      { code: 'razorpay', configured: false, isEnabled: false, label: 'Razorpay' }
    ]);

    const deniedUpdate = await request(app)
      .patch('/api/v1/payment-gateways/razorpay')
      .set(managerAccess)
      .send({ businessId: businessAId, isEnabled: true });
    expect(deniedUpdate.status).toBe(403);
  });

  it('refuses to enable a gateway before all its required fields are set', async () => {
    const { app, businessAId, loginAs } = await createCatalogTestContext();
    const ownerAccess = await loginAs('owner@example.com');

    const incomplete = await request(app)
      .patch('/api/v1/payment-gateways/razorpay')
      .set(ownerAccess)
      .send({ businessId: businessAId, credentials: { keyId: 'rzp_live_abc' }, isEnabled: true });

    expect(incomplete.status).toBe(400);
    expect(incomplete.body.message).toMatch(/keySecret/);
  });

  it('saves credentials without ever echoing them back, and keeps blank fields on a later partial update', async () => {
    const { app, businessAId, loginAs } = await createCatalogTestContext();
    const ownerAccess = await loginAs('owner@example.com');

    const enabled = await request(app)
      .patch('/api/v1/payment-gateways/razorpay')
      .set(ownerAccess)
      .send({
        businessId: businessAId,
        credentials: { keyId: 'rzp_live_abc', keySecret: 'super-secret', webhookSecret: 'webhook-secret' },
        isEnabled: true
      });

    expect(enabled.status).toBe(200);
    expect(enabled.body.data).toMatchObject({ code: 'razorpay', configured: true, isEnabled: true });
    expect(JSON.stringify(enabled.body)).not.toContain('super-secret');
    expect(JSON.stringify(enabled.body)).not.toContain('webhook-secret');

    // Disabling with no credentials field at all must not wipe the stored secret.
    const disabled = await request(app)
      .patch('/api/v1/payment-gateways/razorpay')
      .set(ownerAccess)
      .send({ businessId: businessAId, isEnabled: false });
    expect(disabled.status).toBe(200);
    expect(disabled.body.data).toMatchObject({ configured: true, isEnabled: false });

    // Re-enabling with no credentials payload succeeds only because the
    // previously-saved fields are still there — proves the merge kept them.
    const reEnabled = await request(app)
      .patch('/api/v1/payment-gateways/razorpay')
      .set(ownerAccess)
      .send({ businessId: businessAId, isEnabled: true });
    expect(reEnabled.status).toBe(200);
    expect(reEnabled.body.data).toMatchObject({ configured: true, isEnabled: true });

    // A partial update to just one field must not clobber the others —
    // verified indirectly: re-enabling above only works if keySecret and
    // webhookSecret from the first save both survived every update since.
    const rotateKeyId = await request(app)
      .patch('/api/v1/payment-gateways/razorpay')
      .set(ownerAccess)
      .send({ businessId: businessAId, credentials: { keyId: 'rzp_live_rotated' } });
    expect(rotateKeyId.status).toBe(200);
    expect(rotateKeyId.body.data).toMatchObject({ configured: true, isEnabled: true });
  });

  it('refuses to store new credentials when the server has no encryption key configured', async () => {
    const { app, businessAId, loginAs } = await createCatalogTestContext({ credentialsEncryptionKey: null });
    const ownerAccess = await loginAs('owner@example.com');

    const response = await request(app)
      .patch('/api/v1/payment-gateways/razorpay')
      .set(ownerAccess)
      .send({
        businessId: businessAId,
        credentials: { keyId: 'a', keySecret: 'b', webhookSecret: 'c' },
        isEnabled: true
      });

    expect(response.status).toBe(503);

    // Reading the (still-empty) card must still work even without an
    // encryption key — only writes are refused.
    const list = await request(app)
      .get('/api/v1/payment-gateways')
      .query({ businessId: businessAId })
      .set(ownerAccess);
    expect(list.status).toBe(200);
    expect(list.body.data[0]).toMatchObject({ configured: false, isEnabled: false });
  });
});
