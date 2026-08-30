import type { ClientCustomerRecord } from '@smart-pos/client-data';

import type { SeedBusinessContext } from './seed-context.js';

export const walkInCustomerId = 'cust-walk-in';

export const buildSeedCustomers = (business: SeedBusinessContext): ClientCustomerRecord[] => {
  const now = new Date();
  const base = {
    businessCode: 'DEMO',
    businessId: business.businessId,
    businessName: business.businessName,
    isActive: true,
    updatedAt: now
  };

  return [
    { ...base, id: walkInCustomerId, isWalkIn: true, name: 'Walk-in Customer' },
    {
      ...base,
      email: 'priya.menon@example.com',
      id: 'cust-priya-menon',
      isWalkIn: false,
      mobile: '9845012345',
      name: 'Priya Menon'
    },
    {
      ...base,
      id: 'cust-arjun-nair',
      isWalkIn: false,
      mobile: '9900123456',
      name: 'Arjun Nair'
    },
    {
      ...base,
      email: 'kiran.shah@example.com',
      id: 'cust-kiran-shah',
      isWalkIn: false,
      mobile: '9822334455',
      name: 'Kiran Shah'
    }
  ];
};
