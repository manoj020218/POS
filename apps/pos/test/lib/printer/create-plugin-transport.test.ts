import type { EncodedPrinterJob } from '@smart-pos/printer';
import { describe, expect, it, vi } from 'vitest';

import { createBleTransport, createUsbTransport } from '../../../src/lib/printer/create-plugin-transport.js';
import type { PrinterConnectionManager } from '../../../src/lib/printer/connection-manager.js';

const createJob = (target?: string): EncodedPrinterJob => ({
  bytes: new Uint8Array([1, 2]),
  job: { commands: [], driver: 'ESC_POS' },
  operation: 'PRINT_RECEIPT',
  profile: { connectionType: 'BLUETOOTH', name: 'Counter', paperWidth: '80mm', target }
});

describe('createBleTransport / createUsbTransport', () => {
  it('routes a job to the connection manager with the ble transport and device id', async () => {
    const write = vi.fn(async () => {});
    const manager = { write } as unknown as PrinterConnectionManager;
    const transport = createBleTransport(manager);

    await transport.write(createJob('AA:BB:CC'));

    expect(write).toHaveBeenCalledWith({ deviceId: 'AA:BB:CC', transport: 'ble' }, expect.any(Uint8Array));
  });

  it('routes a job to the connection manager with the usb transport and device id', async () => {
    const write = vi.fn(async () => {});
    const manager = { write } as unknown as PrinterConnectionManager;
    const transport = createUsbTransport(manager);

    await transport.write(createJob('usb-1'));

    expect(write).toHaveBeenCalledWith({ deviceId: 'usb-1', transport: 'usb' }, expect.any(Uint8Array));
  });

  it('throws before touching the connection manager when the profile has no target', async () => {
    const write = vi.fn(async () => {});
    const manager = { write } as unknown as PrinterConnectionManager;
    const transport = createBleTransport(manager);

    await expect(transport.write(createJob(undefined))).rejects.toThrow('requires a target device id');
    expect(write).not.toHaveBeenCalled();
  });
});
