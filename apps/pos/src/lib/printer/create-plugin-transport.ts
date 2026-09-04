import type { BluetoothPrinterTransport, EncodedPrinterJob, UsbPrinterTransport } from '@smart-pos/printer';

import type { PrinterConnectionManager } from './connection-manager.js';

const requireTarget = (input: EncodedPrinterJob) => {
  const target = input.profile.target?.trim();
  if (!target) {
    throw new Error(`${input.profile.connectionType} printer profile requires a target device id`);
  }

  return target;
};

export const createBleTransport = (manager: PrinterConnectionManager): BluetoothPrinterTransport => ({
  write: async (input) => manager.write({ deviceId: requireTarget(input), transport: 'ble' }, input.bytes)
});

export const createUsbTransport = (manager: PrinterConnectionManager): UsbPrinterTransport => ({
  write: async (input) => manager.write({ deviceId: requireTarget(input), transport: 'usb' }, input.bytes)
});
