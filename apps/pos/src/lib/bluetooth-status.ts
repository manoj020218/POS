import { registerPlugin } from '@capacitor/core';

type BluetoothStatusPlugin = {
  isEnabled(): Promise<{ enabled: boolean; supported: boolean }>;
  openSettings(): Promise<void>;
};

// Small native plugin (apps/pos/android's own BluetoothStatusPlugin.java) --
// separate from the printer plugin, which only reports whether a paired
// printer is reachable, not whether the phone/tablet's Bluetooth radio
// itself is switched on.
const BluetoothStatus = registerPlugin<BluetoothStatusPlugin>('BluetoothStatus');

export const isBluetoothEnabled = async (): Promise<boolean> => {
  try {
    const { enabled, supported } = await BluetoothStatus.isEnabled();
    return !supported || enabled;
  } catch {
    // Web/dev builds don't have this native plugin -- fail open.
    return true;
  }
};

export const openBluetoothSettings = async (): Promise<void> => {
  try {
    await BluetoothStatus.openSettings();
  } catch {
    // Nothing sensible to do on platforms without this plugin (web/dev).
  }
};
