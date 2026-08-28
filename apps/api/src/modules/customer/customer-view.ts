import type { BusinessRecord } from '../tenant-core/tenant-core.types.js';
import type { CustomerRecord, CustomerView } from './customer.types.js';

export const toCustomerView = (
  customer: CustomerRecord,
  business: BusinessRecord
): CustomerView => ({
  address: customer.address,
  businessCode: business.code,
  businessId: business.id,
  businessName: business.name,
  email: customer.email,
  id: customer.id,
  isActive: customer.isActive,
  isWalkIn: customer.isWalkIn,
  mobile: customer.mobile,
  name: customer.name,
  notes: customer.notes,
  taxNumber: customer.taxNumber
});
