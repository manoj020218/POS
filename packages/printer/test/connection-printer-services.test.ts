import { describe, expect, it, vi } from 'vitest';

import {
  createBluetoothPrinterService,
  createPrinterTestPageJob,
  createProfileAwarePrinterService,
  createSystemPrinterService,
  createUsbPrinterService,
  type BluetoothPrinterTransport,
  type ReceiptPrinterProfile,
  type SystemPrinterTransport,
  type UsbPrinterTransport
} from '../src/index.js';

const createTransportCapture = <
  TTransport extends BluetoothPrinterTransport | SystemPrinterTransport | UsbPrinterTransport
>() => {
  const writes: Parameters<TTransport['write']>[0][] = [];

  return {
    transport: {
      write: async (input: Parameters<TTransport['write']>[0]) => {
        writes.push(input);
      }
    } as TTransport,
    writes
  };
};

describe('connection printer services', () => {
  it('uses the injected bluetooth transport and validates the target device', async () => {
    const { transport, writes } = createTransportCapture<BluetoothPrinterTransport>();
    const profile: ReceiptPrinterProfile = {
      connectionType: 'BLUETOOTH',
      name: 'Handheld Printer',
      paperWidth: '58mm',
      target: 'AA:BB:CC:DD:EE:FF'
    };
    const service = createBluetoothPrinterService(transport, () => new Date('2026-08-29T13:00:00.000Z'));
    const job = createPrinterTestPageJob(profile);

    const result = await service.printReceipt({ job, profile });

    expect(result.connectionType).toBe('BLUETOOTH');
    expect(writes).toHaveLength(1);
    expect(writes[0]?.operation).toBe('PRINT_RECEIPT');
    expect(writes[0]?.bytes.length).toBeGreaterThan(0);
    await expect(
      service.printReceipt({
        job,
        profile: { ...profile, target: undefined }
      })
    ).rejects.toThrow('Bluetooth printer profile requires a target device identifier');
  });

  it('uses the injected USB and SYSTEM transports without coupling the package to platform libraries', async () => {
    const usbCapture = createTransportCapture<UsbPrinterTransport>();
    const systemCapture = createTransportCapture<SystemPrinterTransport>();
    const usbProfile: ReceiptPrinterProfile = {
      connectionType: 'USB',
      name: 'USB Receipt Printer',
      paperWidth: '80mm',
      target: 'VID:1234-PID:5678'
    };
    const systemProfile: ReceiptPrinterProfile = {
      connectionType: 'SYSTEM',
      name: 'Windows Queue',
      paperWidth: '80mm'
    };
    const usbService = createUsbPrinterService(usbCapture.transport);
    const systemService = createSystemPrinterService(systemCapture.transport);

    await usbService.printTestPage({
      job: createPrinterTestPageJob(usbProfile),
      profile: usbProfile
    });
    await systemService.printTestPage({
      job: createPrinterTestPageJob(systemProfile),
      profile: systemProfile
    });

    expect(usbCapture.writes[0]?.operation).toBe('PRINT_TEST_PAGE');
    expect(systemCapture.writes[0]?.profile.connectionType).toBe('SYSTEM');
  });

  it('routes print requests by profile connection type', async () => {
    const tcpService = {
      cutPaper: vi.fn(),
      openCashDrawer: vi.fn(),
      printBarcode: vi.fn(),
      printKitchenOrder: vi.fn(),
      printQrCode: vi.fn(),
      printReceipt: vi.fn().mockResolvedValue('tcp'),
      printTestPage: vi.fn()
    };
    const systemService = {
      cutPaper: vi.fn(),
      openCashDrawer: vi.fn(),
      printBarcode: vi.fn(),
      printKitchenOrder: vi.fn(),
      printQrCode: vi.fn(),
      printReceipt: vi.fn().mockResolvedValue('system'),
      printTestPage: vi.fn()
    };
    const router = createProfileAwarePrinterService({
      SYSTEM: systemService,
      TCP: tcpService
    });
    const systemProfile: ReceiptPrinterProfile = {
      connectionType: 'SYSTEM',
      name: 'Counter Queue',
      paperWidth: '58mm'
    };

    const result = await router.printReceipt({
      job: createPrinterTestPageJob(systemProfile),
      profile: systemProfile
    });

    expect(result).toBe('system');
    expect(systemService.printReceipt).toHaveBeenCalledTimes(1);
    expect(tcpService.printReceipt).not.toHaveBeenCalled();
  });
});
