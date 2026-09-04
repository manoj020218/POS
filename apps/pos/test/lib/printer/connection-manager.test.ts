import { ThermalPrinterError, type PrinterConnectionOptions, type ThermalPrinterPlugin } from '@jenix/cap-thermal-printer';
import { describe, expect, it, vi } from 'vitest';

import { createPrinterConnectionManager } from '../../../src/lib/printer/connection-manager.js';

const createFakePlugin = (overrides: Partial<ThermalPrinterPlugin> = {}) =>
  ({
    connect: vi.fn(async () => ({ connected: true, connectionState: 'connected' as const })),
    write: vi.fn(async () => ({ written: 1 })),
    ...overrides
  }) as unknown as ThermalPrinterPlugin;

const bleOptions: PrinterConnectionOptions = { deviceId: 'AA:BB', transport: 'ble' };

describe('createPrinterConnectionManager', () => {
  it('connects once and reuses the connection for the same device on later writes', async () => {
    const plugin = createFakePlugin();
    const manager = createPrinterConnectionManager(plugin);

    await manager.write(bleOptions, new Uint8Array([1, 2, 3]));
    await manager.write(bleOptions, new Uint8Array([4, 5]));

    expect(plugin.connect).toHaveBeenCalledTimes(1);
    expect(plugin.write).toHaveBeenCalledTimes(2);
    expect(plugin.write).toHaveBeenNthCalledWith(1, { data: [1, 2, 3] });
    expect(plugin.write).toHaveBeenNthCalledWith(2, { data: [4, 5] });
  });

  it('reconnects when the target device changes', async () => {
    const plugin = createFakePlugin();
    const manager = createPrinterConnectionManager(plugin);

    await manager.write(bleOptions, new Uint8Array([1]));
    await manager.write({ deviceId: 'usb-1', transport: 'usb' }, new Uint8Array([2]));

    expect(plugin.connect).toHaveBeenCalledTimes(2);
  });

  it('reconnects once and retries after a NOT_CONNECTED write failure', async () => {
    let writeCalls = 0;
    const plugin = createFakePlugin({
      write: vi.fn(async () => {
        writeCalls += 1;
        if (writeCalls === 1) {
          throw new ThermalPrinterError('NOT_CONNECTED', 'link dropped');
        }
        return { written: 1 };
      })
    });
    const manager = createPrinterConnectionManager(plugin);

    await manager.write(bleOptions, new Uint8Array([9]));

    expect(plugin.connect).toHaveBeenCalledTimes(2);
    expect(plugin.write).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-connection write failures', async () => {
    const plugin = createFakePlugin({
      write: vi.fn(async () => {
        throw new ThermalPrinterError('WRITE_FAILED', 'buffer overflow');
      })
    });
    const manager = createPrinterConnectionManager(plugin);

    await expect(manager.write(bleOptions, new Uint8Array([1]))).rejects.toThrow('buffer overflow');
    expect(plugin.connect).toHaveBeenCalledTimes(1);
    expect(plugin.write).toHaveBeenCalledTimes(1);
  });
});
