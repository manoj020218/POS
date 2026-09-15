import { App } from '@capacitor/app';

import { apiBaseUrl } from './api-config.js';

export type InstalledAppVersion = { versionCode: number; versionName: string };

/** Falls back to a dev-build marker on web/dev, where the native App plugin isn't available. */
export const getInstalledAppVersion = async (): Promise<InstalledAppVersion> => {
  try {
    const info = await App.getInfo();
    return { versionCode: Number(info.build) || 0, versionName: info.version };
  } catch {
    return { versionCode: 0, versionName: 'dev' };
  }
};

export type LatestAppVersion = {
  latestVersionCode: number;
  latestVersionName: string;
  playStoreUrl: string;
};

/** Returns null on any failure (offline, server down) rather than throwing -- an update check must never block using the app. */
export const fetchLatestAppVersion = async (): Promise<LatestAppVersion | null> => {
  try {
    const response = await fetch(`${apiBaseUrl}/pos/version`);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as LatestAppVersion;
  } catch {
    return null;
  }
};
