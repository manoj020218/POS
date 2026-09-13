import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

const tinyPngBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

describe('product image upload', () => {
  let uploadDir: string;

  beforeEach(async () => {
    uploadDir = await mkdtemp(path.join(tmpdir(), 'smartpos-uploads-'));
  });

  afterEach(async () => {
    await rm(uploadDir, { force: true, recursive: true });
  });

  it('stores an uploaded image and returns its public URL', async () => {
    const { app, loginAs } = await createCatalogTestContext({
      productImageUploadConfig: { publicBaseUrl: 'https://smartpos.iotsoft.in', uploadDir }
    });
    const managerAccess = await loginAs('manager@example.com');

    const response = await request(app)
      .post('/api/v1/products/image-upload')
      .set(managerAccess)
      .attach('image', tinyPngBytes, { contentType: 'image/png', filename: 'product.png' });

    expect(response.status).toBe(201);
    expect(response.body.data.url).toMatch(
      /^https:\/\/smartpos\.iotsoft\.in\/api\/uploads\/products\/[0-9a-f-]+\.png$/
    );

    const files = await readdir(uploadDir);
    expect(files).toHaveLength(1);

    // Regression: the returned URL must actually be reachable, not just
    // shaped correctly — a prior bug had the static file server mounted one
    // path segment short of what this URL points at, so every uploaded image
    // 404ed the moment anything tried to actually display it.
    const imagePath = new URL(response.body.data.url).pathname;
    const imageResponse = await request(app).get(imagePath);
    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('rejects an unsupported file type', async () => {
    const { app, loginAs } = await createCatalogTestContext({
      productImageUploadConfig: { publicBaseUrl: 'https://smartpos.iotsoft.in', uploadDir }
    });
    const managerAccess = await loginAs('manager@example.com');

    const response = await request(app)
      .post('/api/v1/products/image-upload')
      .set(managerAccess)
      .attach('image', Buffer.from('not an image'), { contentType: 'text/plain', filename: 'notes.txt' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('UNSUPPORTED_IMAGE_TYPE');
  });

  it('returns 503 when image hosting is not configured', async () => {
    const { app, loginAs } = await createCatalogTestContext();
    const managerAccess = await loginAs('manager@example.com');

    const response = await request(app)
      .post('/api/v1/products/image-upload')
      .set(managerAccess)
      .attach('image', tinyPngBytes, { contentType: 'image/png', filename: 'product.png' });

    expect(response.status).toBe(503);
    expect(response.body.code).toBe('IMAGE_UPLOAD_NOT_CONFIGURED');
  });

  it('requires product:create permission', async () => {
    const { app, loginAs } = await createCatalogTestContext({
      productImageUploadConfig: { publicBaseUrl: 'https://smartpos.iotsoft.in', uploadDir }
    });
    const cashierAccess = await loginAs('cashier@example.com');

    const response = await request(app)
      .post('/api/v1/products/image-upload')
      .set(cashierAccess)
      .attach('image', tinyPngBytes, { contentType: 'image/png', filename: 'product.png' });

    expect(response.status).toBe(403);
  });
});
