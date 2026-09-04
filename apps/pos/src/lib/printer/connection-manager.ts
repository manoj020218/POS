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

    await plugin.connect(options);
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
