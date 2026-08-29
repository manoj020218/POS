import type { ClientDataStore } from './client-data-store.js';
import type { ClientRemoteApi } from './remote-api.js';

export const createClientBootstrapService = (input: {
  remoteApi: ClientRemoteApi;
  store: Pick<ClientDataStore, 'settings'>;
}) => ({
  refreshBusinessSettings: async (query?: { businessId?: string }) => {
    const settings = await input.remoteApi.getBusinessSettings(query);
    await input.store.settings.saveBusinessSettings(settings);
    return settings;
  }
});
