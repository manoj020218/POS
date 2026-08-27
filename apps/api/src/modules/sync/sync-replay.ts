import { createHttpError } from '../../lib/http-error.js';
import { parseSchema } from '../../lib/parse-schema.js';
import {
  hasAllPermissions,
  resolveGrantedPermissions,
  type AppPermission
} from '../auth/authorization.js';
import { createPurchaseSchema } from '../purchase/purchase.schemas.js';
import type { CreatePurchaseRequest } from '../purchase/purchase.types.js';
import { createSaleSchema } from '../sale/sale.schemas.js';
import type { CreateSaleRequest } from '../sale/sale.types.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { SyncEventRecord } from './sync.types.js';

type SyncReplayDependencies = {
  createPurchase: (context: AccessContext, input: CreatePurchaseRequest) => Promise<unknown>;
  createSale: (context: AccessContext, input: CreateSaleRequest) => Promise<unknown>;
};

const saleCreatedPayloadSchema = createSaleSchema.omit({
  branchId: true,
  occurredAt: true
});
const purchaseCreatedPayloadSchema = createPurchaseSchema.omit({
  branchId: true,
  occurredAt: true
});

export const createSyncReplayHandler =
  (dependencies: SyncReplayDependencies) =>
  async (context: AccessContext, event: SyncEventRecord): Promise<boolean> => {
    switch (event.type) {
      case 'PURCHASE_CREATED':
        assertPermission(context, 'purchase:create');
        await dependencies.createPurchase(context, {
          ...parseSchema(purchaseCreatedPayloadSchema, event.payload),
          branchId: event.branchId,
          occurredAt: event.eventCreatedAt
        });
        return true;
      case 'SALE_CREATED':
        assertPermission(context, 'sale:create');
        await dependencies.createSale(context, {
          ...parseSchema(saleCreatedPayloadSchema, event.payload),
          branchId: event.branchId,
          occurredAt: event.eventCreatedAt
        });
        return true;
      default:
        return false;
    }
  };

const assertPermission = (context: AccessContext, permission: AppPermission) => {
  if (!hasAllPermissions(resolveGrantedPermissions(context), [permission])) {
    throw createHttpError(403, 'FORBIDDEN', 'Insufficient permissions');
  }
};
