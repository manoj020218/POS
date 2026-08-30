import type { ClientBusinessSettings } from '@smart-pos/client-data';

import { findTaxProfile, findUnit } from './seed-catalog-meta.js';
import type { SeedBusinessContext } from './seed-context.js';

export const buildSeedSettings = (business: SeedBusinessContext): ClientBusinessSettings => {
  const defaultUnit = findUnit('PCS');
  const defaultTaxProfile = findTaxProfile('GST12');

  return {
    branches: [
      {
        address: '12 MG Road, Bengaluru',
        branchCode: business.branchCode,
        branchId: business.branchId,
        branchName: business.branchName
      }
    ],
    businessCode: 'DEMO',
    businessId: business.businessId,
    businessName: business.businessName,
    currencyCode: 'INR',
    defaultTaxProfile: {
      code: defaultTaxProfile.code,
      id: defaultTaxProfile.id,
      name: defaultTaxProfile.name,
      rateBasisPoints: defaultTaxProfile.rateBasisPoints
    },
    defaultTaxProfileId: defaultTaxProfile.id,
    defaultTrackInventory: true,
    defaultUnit: {
      code: defaultUnit.code,
      id: defaultUnit.id,
      name: defaultUnit.name,
      precision: defaultUnit.precision,
      symbol: defaultUnit.symbol
    },
    defaultUnitId: defaultUnit.id,
    invoicePrefix: 'DEMO',
    receiptFooter: 'Thank you for shopping with us!',
    timezone: 'Asia/Kolkata'
  };
};
