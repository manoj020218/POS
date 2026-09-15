import { useEffect, useState } from 'react';

import { fetchLatestAppVersion, getInstalledAppVersion } from '../lib/app-version.js';

export type AppUpdateStatus = {
  checked: boolean;
  installedVersionCode: number;
  installedVersionName: string;
  playStoreUrl: string;
  updateAvailable: boolean;
};

const DEFAULT_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=in.iotsoft.smartpos';

// Checked once per app session (a POS terminal typically stays open for a
// whole shift) -- not worth polling repeatedly for a check this cheap to
// just re-run the next time the app is opened.
export const useAppUpdateStatus = (): AppUpdateStatus => {
  const [status, setStatus] = useState<AppUpdateStatus>({
    checked: false,
    installedVersionCode: 0,
    installedVersionName: '',
    playStoreUrl: DEFAULT_PLAY_STORE_URL,
    updateAvailable: false
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [installed, latest] = await Promise.all([getInstalledAppVersion(), fetchLatestAppVersion()]);
      if (cancelled) {
        return;
      }
      setStatus({
        checked: true,
        installedVersionCode: installed.versionCode,
        installedVersionName: installed.versionName,
        playStoreUrl: latest?.playStoreUrl ?? DEFAULT_PLAY_STORE_URL,
        updateAvailable: Boolean(latest) && installed.versionCode > 0 && installed.versionCode < latest!.latestVersionCode
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
};
