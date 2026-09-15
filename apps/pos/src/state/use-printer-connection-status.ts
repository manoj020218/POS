import { ThermalPrinter } from '@jenixindia/cap-thermal-printer';
import { useEffect, useRef, useState } from 'react';

import { isBluetoothEnabled } from '../lib/bluetooth-status.js';
import { usePrinterSettings } from './use-printer-settings.js';

const CHECK_INTERVAL_MS = 20_000;

export type PrinterConnectionStatus = 'unpaired' | 'checking' | 'connected' | 'unreachable' | 'bluetooth-off';

/**
 * Proactively tests whether the paired printer is actually reachable right
 * now, rather than just reflecting whatever the plugin's own connect-on-write
 * state happens to be — the app only connects lazily on the first print, so
 * a passive read would show "disconnected" nearly all the time even when
 * everything is fine. This is the same connect() call a real print would
 * make, just without writing any bytes, so a "connected" result here is a
 * real predictor of whether checkout's print step will work.
 */
export const usePrinterConnectionStatus = (): PrinterConnectionStatus => {
  const { currentProfile } = usePrinterSettings();
  const [checkedStatus, setCheckedStatus] = useState<'checking' | 'connected' | 'unreachable' | 'bluetooth-off'>(
    'checking'
  );
  const checkingRef = useRef(false);
  const target = currentProfile?.target;
  const isBluetoothProfile = currentProfile?.connectionType === 'BLUETOOTH';

  useEffect(() => {
    if (!target) {
      return;
    }

    let cancelled = false;

    const check = async () => {
      if (checkingRef.current) {
        return;
      }
      checkingRef.current = true;

      try {
        if (isBluetoothProfile && !(await isBluetoothEnabled())) {
          if (!cancelled) {
            setCheckedStatus('bluetooth-off');
          }
          return;
        }

        await ThermalPrinter.connect(
          isBluetoothProfile ? { deviceId: target, transport: 'ble' } : { deviceId: target, transport: 'usb' }
        );
        if (!cancelled) {
          setCheckedStatus('connected');
        }
      } catch {
        if (!cancelled) {
          setCheckedStatus('unreachable');
        }
      } finally {
        checkingRef.current = false;
      }
    };

    void check();
    const interval = setInterval(() => void check(), CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isBluetoothProfile, target]);

  return target ? checkedStatus : 'unpaired';
};
