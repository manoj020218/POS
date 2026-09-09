import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { InMemoryKioskRepository } from '../src/modules/kiosk/in-memory-kiosk.repository.js';
import type { PaymentGateway } from '../src/modules/kiosk/payment-gateway.js';
import { createCatalogTestContext } from './helpers/catalog-app.js';

const fakeGateway = (): PaymentGateway & { lastOrderId?: string } => {
  const gateway: PaymentGateway & { lastOrderId?: string } = {
    createUpiQrOrder: async () => {
      gateway.lastOrderId = `qr_${Math.random().toString(36).slice(2)}`;
      return { gatewayOrderId: gateway.lastOrderId, qrImageUrl: 'https://razorpay.example/qr.png' };
    },
    parseWebhookPaymentEvent: (rawBody) => {
      const body = JSON.parse(rawBody) as { gatewayOrderId: string; paymentRef: string };
      return { gatewayOrderId: body.gatewayOrderId, paymentRef: body.paymentRef };
    }
  };
  return gateway;
};

describe('kiosk routes', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let branchAId: string;
  let businessAId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];
  let terminalAId: string;

  it('creates a token-only kiosk order and lists it in the active queue', async () => {
    ({ app, branchAId, businessAId, loginAs, terminalAId } = await createCatalogTestContext());
    const managerAccess = await loginAs('manager@example.com');
    const product = await request(app).post('/api/v1/products').set(managerAccess).send({
      name: 'Pani Puri',
      sellingPrice: 80
    });

    const created = await request(app).post('/api/v1/kiosk/orders').set(managerAccess).send({
      branchId: branchAId,
      items: [{ productId: product.body.data.id, quantity: 2 }],
      terminalId: terminalAId
    });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      status: 'UNPAID_TOKEN',
      tokenNumber: 'K-001',
      totalAmount: 160
    });

    const queue = await request(app)
      .get('/api/v1/kiosk/orders')
      .query({ businessId: businessAId })
      .set(managerAccess);

    expect(queue.status).toBe(200);
    expect(queue.body.data).toHaveLength(1);
    expect(queue.body.data[0].tokenNumber).toBe('K-001');
  });

  it('allocates sequential token numbers per terminal per day', async () => {
    ({ app, branchAId, loginAs, terminalAId } = await createCatalogTestContext());
    const managerAccess = await loginAs('manager@example.com');
    const product = await request(app).post('/api/v1/products').set(managerAccess).send({
      name: 'Vada Pav',
      sellingPrice: 40
    });

    const first = await request(app).post('/api/v1/kiosk/orders').set(managerAccess).send({
      branchId: branchAId,
      items: [{ productId: product.body.data.id, quantity: 1 }],
      terminalId: terminalAId
    });
    const second = await request(app).post('/api/v1/kiosk/orders').set(managerAccess).send({
      branchId: branchAId,
      items: [{ productId: product.body.data.id, quantity: 1 }],
      terminalId: terminalAId
    });

    expect(first.body.data.tokenNumber).toBe('K-001');
    expect(second.body.data.tokenNumber).toBe('K-002');
  });

  it('updates and reads per-terminal kiosk settings, gated behind terminal permissions', async () => {
    ({ app, loginAs, terminalAId } = await createCatalogTestContext());
    const ownerAccess = await loginAs('owner@example.com');
    const managerAccess = await loginAs('manager@example.com');

    const denied = await request(app)
      .patch(`/api/v1/terminals/${terminalAId}/kiosk-settings`)
      .set(managerAccess)
      .send({ mode: 'SELF_SERVICE_KIOSK' });
    expect(denied.status).toBe(403);

    const updated = await request(app)
      .patch(`/api/v1/terminals/${terminalAId}/kiosk-settings`)
      .set(ownerAccess)
      .send({ gatewayTimeoutMinutes: 3, kioskCollectsPayment: true, mode: 'SELF_SERVICE_KIOSK', printDualTokens: true });

    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      gatewayTimeoutMinutes: 3,
      kioskCollectsPayment: true,
      mode: 'SELF_SERVICE_KIOSK',
      printDualTokens: true
    });

    const fetched = await request(app)
      .get(`/api/v1/terminals/${terminalAId}/kiosk-settings`)
      .set(ownerAccess);
    expect(fetched.body.data.mode).toBe('SELF_SERVICE_KIOSK');
  });

  it('creates a gateway-backed order and completes it into a real sale via the webhook', async () => {
    const gateway = fakeGateway();
    ({ app, branchAId, loginAs, terminalAId } = await createCatalogTestContext({ paymentGateway: gateway }));
    const ownerAccess = await loginAs('owner@example.com');
    const managerAccess = await loginAs('manager@example.com');

    const settingsUpdate = await request(app)
      .patch(`/api/v1/terminals/${terminalAId}/kiosk-settings`)
      .set(ownerAccess)
      .send({ kioskCollectsPayment: true, mode: 'SELF_SERVICE_KIOSK' });
    expect(settingsUpdate.status).toBe(200);

    const product = await request(app).post('/api/v1/products').set(managerAccess).send({
      name: 'Cold Coffee',
      sellingPrice: 50
    });

    const created = await request(app).post('/api/v1/kiosk/orders').set(managerAccess).send({
      branchId: branchAId,
      items: [{ productId: product.body.data.id, quantity: 1 }],
      terminalId: terminalAId
    });

    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('AWAITING_PAYMENT');
    expect(created.body.data.gatewayQrImageUrl).toBe('https://razorpay.example/qr.png');

    const webhook = await request(app)
      .post('/api/v1/kiosk/webhooks/razorpay')
      .send({ gatewayOrderId: gateway.lastOrderId, paymentRef: 'pay_test123' });
    expect(webhook.status).toBe(200);

    const fetched = await request(app)
      .get(`/api/v1/kiosk/orders/${created.body.data.id}`)
      .set(managerAccess);
    // FULFILLED is only ever set after createSaleHandler succeeds inside the
    // webhook handler, so this is also proof a real Sale row now exists.
    expect(fetched.body.data.status).toBe('FULFILLED');
    expect(fetched.body.data.paidStamp).toBe(true);
  });

  it('expires an awaiting-payment order past its gateway timeout', async () => {
    const kioskRepository = new InMemoryKioskRepository();
    const gateway = fakeGateway();
    ({ app, branchAId, loginAs, terminalAId } = await createCatalogTestContext({
      kioskRepository,
      paymentGateway: gateway
    }));
    const ownerAccess = await loginAs('owner@example.com');
    const managerAccess = await loginAs('manager@example.com');

    const settingsUpdate = await request(app)
      .patch(`/api/v1/terminals/${terminalAId}/kiosk-settings`)
      .set(ownerAccess)
      .send({ gatewayTimeoutMinutes: 1, kioskCollectsPayment: true, mode: 'SELF_SERVICE_KIOSK' });
    expect(settingsUpdate.status).toBe(200);

    const product = await request(app).post('/api/v1/products').set(managerAccess).send({
      name: 'Dahi Puri',
      sellingPrice: 60
    });
    const created = await request(app).post('/api/v1/kiosk/orders').set(managerAccess).send({
      branchId: branchAId,
      items: [{ productId: product.body.data.id, quantity: 1 }],
      terminalId: terminalAId
    });

    await kioskRepository.updateKioskOrder(created.body.data.id, '11111111-1111-4111-8111-111111111111', {
      expiresAt: new Date(Date.now() - 60 * 1000)
    });

    const fetched = await request(app)
      .get(`/api/v1/kiosk/orders/${created.body.data.id}`)
      .set(managerAccess);
    expect(fetched.body.data.status).toBe('EXPIRED');
  });
});
