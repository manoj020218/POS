import type { PrinterConnectionOptions, PrinterErrorCode, ThermalPrinterPlugin } from '@jenix/cap-thermal-printer';

const connectionKey = (options: PrinterConnectionOptions) =>
  options.transport === 'ble'
    ? `ble:${options.deviceId}`
    : `usb:${options.deviceId ?? `${options.vendorId ?? ''}:${options.productId ?? ''}`}`;

// The plugin's methods return the raw Capacitor native-bridge promise (see
// @jenix/cap-thermal-printer's index.ts), which rejects with a plain
// CapacitorException carrying a `.code` string — never an actual
// ThermalPrinterError instance. Match on that `.code` directly rather than
// `instanceof ThermalPrinterError`, which never matches a real device error.
const errorCode = (error: unknown): PrinterErrorCode | undefined =>
  typeof error === 'object' && error !== null && 'code' in error
    ? ((error as { code?: unknown }).code as PrinterErrorCode | undefined)
    : undefined;

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
      if (errorCode(error) !== 'CONNECTION_FAILED') {
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
      if (errorCode(error) !== 'NOT_CONNECTED') {
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
