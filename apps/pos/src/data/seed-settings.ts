import type { ClientBusinessSettings } from '@smart-pos/client-data';

import { demoIds, demoTerminalContext } from '../lib/demo-context.js';
import { findTaxProfile, findUnit } from './seed-catalog-meta.js';

export const buildSeedSettings = (): ClientBusinessSettings => {
  const defaultUnit = findUnit('PCS');
  const defaultTaxProfile = findTaxProfile('GST12');

  return {
    branches: [
      {
        branchCode: demoTerminalContext.branchCode,
        branchId: demoIds.branchId,
        branchName: demoTerminalContext.branchName,
        address: '12 MG Road, Bengaluru'
      }
    ],
    businessCode: 'DEMO',
    businessId: demoIds.businessId,
    businessName: 'Smart POS Demo Store',
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
