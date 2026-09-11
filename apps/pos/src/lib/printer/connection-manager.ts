import { ThermalPrinterError, type PrinterConnectionOptions, type ThermalPrinterPlugin } from '@jenix/cap-thermal-printer';

const connectionKey = (options: PrinterConnectionOptions) =>
  options.transport === 'ble'
    ? `ble:${options.deviceId}`
    : `usb:${options.deviceId ?? `${options.vendorId ?? ''}:${options.productId ?? ''}`}`;

/**
 * Bridges packages/printer's stateless per-job transports onto the plugin's
 * connect-once-then-write API: reuses an existing connection when the target
 * device hasn't changed, and retries once after a fresh connect if the plugin
 * reports the link dropped between prints.
 */
export const createPrinterConnectionManager = (plugin: ThermalPrinterPlugin) => {
  let connectedKey: string | null = null;

  const connectIfNeeded = async (options: PrinterConnectionOptions) => {
    const key = connectionKey(options);
    if (connectedKey === key) {
      return;
    }

    try {
      await plugin.connect(options);
    } catch (error) {
      // The native plugin keeps its own connection state independent of this
      // manager's `connectedKey` (e.g. a BLE link left open from a previous
      // app session survives a reload), so it rejects a connect to a
      // different transport/device until the old one is torn down first.
      if (!(error instanceof ThermalPrinterError) || error.code !== 'CONNECTION_FAILED') {
        throw error;
      }

      await plugin.disconnect();
      await plugin.connect(options);
    }

    connectedKey = key;
  };

  const write = async (options: PrinterConnectionOptions, bytes: Uint8Array): Promise<void> => {
    await connectIfNeeded(options);

    try {
      await plugin.write({ data: Array.from(bytes) });
    } catch (error) {
      if (!(error instanceof ThermalPrinterError) || error.code !== 'NOT_CONNECTED') {
        throw error;
      }

      connectedKey = null;
      await connectIfNeeded(options);
      await plugin.write({ data: Array.from(bytes) });
    }
  };

  return { write };
};

export type PrinterConnectionManager = ReturnType<typeof createPrinterConnectionManager>;
