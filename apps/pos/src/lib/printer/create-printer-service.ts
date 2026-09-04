import { ThermalPrinter } from '@jenix/cap-thermal-printer';
import { createBluetoothPrinterService, createProfileAwarePrinterService, createUsbPrinterService } from '@smart-pos/printer';

import { createBleTransport, createUsbTransport } from './create-plugin-transport.js';
import { createPrinterConnectionManager } from './connection-manager.js';

export const createPosPrinterService = () => {
  const manager = createPrinterConnectionManager(ThermalPrinter);

  return createProfileAwarePrinterService({
    BLUETOOTH: createBluetoothPrinterService(createBleTransport(manager)),
    USB: createUsbPrinterService(createUsbTransport(manager))
  });
};
