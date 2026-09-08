import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

/**
 * Opens the native ML Kit barcode scanner UI and resolves with the first
 * detected barcode's raw value, or null if the user cancelled. Throws with a
 * user-facing message if scanning isn't possible on this device.
 */
export const scanBarcode = async (): Promise<string | null> => {
  const { supported } = await BarcodeScanner.isSupported();
  if (!supported) {
    throw new Error('Barcode scanning is not supported on this device');
  }

  const permission = await BarcodeScanner.checkPermissions();
  if (permission.camera !== 'granted' && permission.camera !== 'limited') {
    const requested = await BarcodeScanner.requestPermissions();
    if (requested.camera !== 'granted' && requested.camera !== 'limited') {
      throw new Error('Camera permission is required to scan a barcode');
    }
  }

  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (!available) {
    await BarcodeScanner.installGoogleBarcodeScannerModule();
  }

  const { barcodes } = await BarcodeScanner.scan();
  return barcodes[0]?.rawValue ?? null;
};
