import type { CustomerRepository } from '../customer/customer.repository.js';
import { toCustomerView } from '../customer/customer-view.js';
import type { CustomerUpdatedSinceInput } from '../customer/customer.types.js';
import { requiredRecord } from '../catalog/product-view.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import {
  buildCustomerSyncPullChangeKey,
  buildSyncPullChangeId
} from './sync-pull-cursor.js';
import type { SyncPullChange } from './sync.types.js';

type SyncPullChangeEnvelope = {
  change: Extract<SyncPullChange, { source: 'SERVER' }>;
  changeKey: string;
  updatedAt: Date;
};

export const listCustomerSyncPullChanges = async (
  customerRepository: CustomerRepository,
  tenantCoreRepository: TenantCoreRepository,
  tenantId: string,
  businessIds: string[],
  input: CustomerUpdatedSinceInput
): Promise<SyncPullChangeEnvelope[]> => {
  const customers = await customerRepository.listCustomersUpdatedSince(tenantId, businessIds, input);
  if (customers.length === 0) {
    return [];
  }

  const changedBusinessIds = [...new Set(customers.map((customer) => customer.businessId))];
  const businesses = await tenantCoreRepository.listBusinesses(tenantId);
  const businessMap = new Map(
    businesses
      .filter((business) => changedBusinessIds.includes(business.id))
      .map((business) => [business.id, business])
  );

  return customers.map((customer) => ({
    change: {
      businessId: customer.businessId,
      changeId: buildSyncPullChangeId(
        buildCustomerSyncPullChangeKey(customer.id),
        customer.updatedAt
      ),
      changeType: 'CUSTOMER_UPSERTED' as const,
      record: {
        ...toCustomerView(
          customer,
          requiredRecord(businessMap, customer.businessId, 'BUSINESS_NOT_FOUND', 'Business not found')
        ),
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString()
      },
      source: 'SERVER' as const,
      updatedAt: customer.updatedAt.toISOString()
    },
    changeKey: buildCustomerSyncPullChangeKey(customer.id),
    updatedAt: customer.updatedAt
  }));
};
