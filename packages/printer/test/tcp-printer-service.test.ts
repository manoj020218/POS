import { createServer } from 'node:net';

import { describe, expect, it } from 'vitest';

import { createPrinterTestPageJob, type ReceiptPrinterProfile } from '../src/index.js';
import { createTcpPrinterService } from '../src/tcp-printer-service.js';

const closeServer = (server: ReturnType<typeof createServer>) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

describe('createTcpPrinterService', () => {
  it('sends encoded ESC/POS bytes to a TCP printer endpoint', async () => {
    const server = createServer();
    const receivedBytes = new Promise<Uint8Array>((resolve) => {
      server.on('connection', (socket) => {
        const chunks: Buffer[] = [];

        socket.on('data', (chunk) => {
          chunks.push(chunk);
        });
        socket.on('end', () => {
          resolve(Uint8Array.from(Buffer.concat(chunks)));
        });
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('TCP test server did not expose an address');
    }

    const profile: ReceiptPrinterProfile = {
      connectionType: 'TCP',
      name: 'Billing Printer',
      paperWidth: '58mm',
      port: address.port,
      target: '127.0.0.1'
    };
    const service = createTcpPrinterService({
      connectTimeoutMs: 1000,
      now: () => new Date('2026-08-29T13:10:00.000Z')
    });

    const result = await service.printTestPage({
      job: createPrinterTestPageJob(profile, new Date('2026-08-29T13:09:00.000Z')),
      profile
    });
    const bytes = Array.from(await receivedBytes);
    await closeServer(server);

    expect(result.operation).toBe('PRINT_TEST_PAGE');
    expect(bytes.slice(0, 2)).toEqual([0x1b, 0x40]);
    expect(bytes).toEqual(expect.arrayContaining([0x50, 0x72, 0x69, 0x6e, 0x74, 0x65, 0x72]));
  });

  it('rejects TCP profiles without a host or valid port', async () => {
    const service = createTcpPrinterService();
    const profile: ReceiptPrinterProfile = {
      connectionType: 'TCP',
      name: 'Broken Printer',
      paperWidth: '58mm'
    };

    await expect(
      service.printReceipt({
        job: createPrinterTestPageJob(profile),
        profile
      })
    ).rejects.toThrow('TCP printer profile requires a target host');
  });
});
