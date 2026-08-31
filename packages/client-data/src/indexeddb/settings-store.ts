import { clone } from '../in-memory-store-helpers.js';
import type { ClientBusinessSettings, SettingsRepository } from '../settings-repository.js';
import { storeNames } from './db-connection.js';
import { getOne, putOne } from './idb-helpers.js';

export const createIndexedDbSettingsStore = (db: IDBDatabase): SettingsRepository => ({
  findBusinessSettings: async (businessId) => {
    const settings = await getOne<ClientBusinessSettings>(db, storeNames.settings, businessId);
    return settings ? clone(settings) : null;
  },
  saveBusinessSettings: async (settings) => {
    await putOne(db, storeNames.settings, settings);
  }
});
