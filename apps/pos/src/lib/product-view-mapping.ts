import type { ClientProductRecord, ClientRemoteProductView } from '@smart-pos/client-data';

export const toClientProductRecord = (view: ClientRemoteProductView): ClientProductRecord => ({
  ...view,
  sku: view.sku ?? '',
  updatedAt: new Date()
});
