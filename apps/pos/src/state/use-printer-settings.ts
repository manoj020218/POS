import { ThermalPrinter, type PrinterDevice, type PrinterTransportType } from '@jenix/cap-thermal-printer';
import type { ReceiptPrinterProfile } from '@smart-pos/printer';
import { useState } from 'react';

import { usePosContext } from './use-pos-context.js';

const toConnectionType = (transport: PrinterTransportType): ReceiptPrinterProfile['connectionType'] =>
  transport === 'ble' ? 'BLUETOOTH' : 'USB';

const toMessage = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback);

export const usePrinterSettings = () => {
  const { refreshSettings, remoteApi, settings, terminalContext } = usePosContext();
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentProfile = settings.branches.find(
    (branch) => branch.branchId === terminalContext.branchId
  )?.receiptPrinterProfile;

  const scan = async () => {
    setError(null);
    setScanning(true);
    try {
      const known = await ThermalPrinter.getDevices();
      const found = await ThermalPrinter.scan({ timeoutMs: 8000 });
      const byId = new Map([...known.devices, ...found.devices].map((device) => [device.id, device]));
      setDevices([...byId.values()]);
    } catch (cause) {
      setError(toMessage(cause, 'Could not scan for printers'));
    } finally {
      setScanning(false);
    }
  };

  const saveProfile = async (profile: ReceiptPrinterProfile | null) => {
    setError(null);
    setSaving(true);
    try {
      await remoteApi.updateBusinessSettings({
        branches: [{ branchId: terminalContext.branchId, receiptPrinterProfile: profile }]
      });
      await refreshSettings();
    } catch (cause) {
      setError(toMessage(cause, 'Could not save printer settings'));
    } finally {
      setSaving(false);
    }
  };

  const pair = (device: PrinterDevice, paperWidth: ReceiptPrinterProfile['paperWidth']) =>
    saveProfile({
      autoPrintReceipt: true,
      connectionType: toConnectionType(device.transport),
      name: device.name ?? device.id,
      paperWidth,
      target: device.id
    });

  const unpair = () => saveProfile(null);

  return { currentProfile, devices, error, pair, saving, scan, scanning, unpair };
};
