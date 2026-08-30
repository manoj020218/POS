import type { ClientProductRecord } from '@smart-pos/client-data';

import {
  findCategory,
  findTaxProfile,
  findUnit,
  type DemoCategoryCode,
  type DemoTaxCode,
  type DemoUnitCode
} from './seed-catalog-meta.js';
import type { SeedBusinessContext } from './seed-context.js';

type ProductSeed = {
  barcode: string;
  category: DemoCategoryCode;
  lowStockLevel: number;
  name: string;
  openingStock: number;
  purchasePrice: number;
  sellingPrice: number;
  sku: string;
  tax: DemoTaxCode;
  trackInventory?: boolean;
  unit: DemoUnitCode;
};

const seeds: ProductSeed[] = [
  { barcode: '8901001', category: 'BEV', lowStockLevel: 10, name: 'Filter Coffee 200ml', openingStock: 48, purchasePrice: 18, sellingPrice: 30, sku: 'BEV-COF-200', tax: 'GST12', unit: 'PCS' },
  { barcode: '8901002', category: 'BEV', lowStockLevel: 12, name: 'Masala Chai 200ml', openingStock: 60, purchasePrice: 14, sellingPrice: 25, sku: 'BEV-CHA-200', tax: 'GST12', unit: 'PCS' },
  { barcode: '8901003', category: 'BEV', lowStockLevel: 15, name: 'Cold Coffee 300ml', openingStock: 30, purchasePrice: 35, sellingPrice: 60, sku: 'BEV-CCF-300', tax: 'GST12', unit: 'PCS' },
  { barcode: '8901004', category: 'BEV', lowStockLevel: 20, name: 'Packaged Water 1L', openingStock: 96, purchasePrice: 10, sellingPrice: 20, sku: 'BEV-WAT-1L', tax: 'GST18', unit: 'PCS' },
  { barcode: '8901005', category: 'BEV', lowStockLevel: 20, name: 'Fresh Orange Juice 250ml', openingStock: 24, purchasePrice: 28, sellingPrice: 50, sku: 'BEV-OJ-250', tax: 'GST12', unit: 'PCS' },
  { barcode: '8902001', category: 'BAK', lowStockLevel: 8, name: 'Butter Croissant', openingStock: 20, purchasePrice: 32, sellingPrice: 55, sku: 'BAK-CRO-01', tax: 'GST5', unit: 'PCS' },
  { barcode: '8902002', category: 'BAK', lowStockLevel: 8, name: 'Chocolate Muffin', openingStock: 18, purchasePrice: 28, sellingPrice: 50, sku: 'BAK-MUF-01', tax: 'GST5', unit: 'PCS' },
  { barcode: '8902003', category: 'BAK', lowStockLevel: 10, name: 'Brown Bread 400g', openingStock: 25, purchasePrice: 32, sellingPrice: 48, sku: 'BAK-BRD-400', tax: 'GST5', unit: 'PCS' },
  { barcode: '8902004', category: 'BAK', lowStockLevel: 6, name: 'Cheese Sandwich', openingStock: 15, purchasePrice: 45, sellingPrice: 80, sku: 'BAK-SDW-01', tax: 'GST5', unit: 'PCS' },
  { barcode: '8903001', category: 'SNK', lowStockLevel: 15, name: 'Potato Chips 90g', openingStock: 40, purchasePrice: 15, sellingPrice: 25, sku: 'SNK-CHP-90', tax: 'GST12', unit: 'PCS' },
  { barcode: '8903002', category: 'SNK', lowStockLevel: 15, name: 'Salted Namkeen 150g', openingStock: 35, purchasePrice: 22, sellingPrice: 40, sku: 'SNK-NMK-150', tax: 'GST12', unit: 'PCS' },
  { barcode: '8903003', category: 'SNK', lowStockLevel: 20, name: 'Chocolate Bar 40g', openingStock: 50, purchasePrice: 18, sellingPrice: 35, sku: 'SNK-CHO-40', tax: 'GST18', unit: 'PCS' },
  { barcode: '8903004', category: 'SNK', lowStockLevel: 10, name: 'Roasted Peanuts 100g', openingStock: 30, purchasePrice: 20, sellingPrice: 35, sku: 'SNK-PNT-100', tax: 'GST5', unit: 'PCS' },
  { barcode: '8904001', category: 'DAI', lowStockLevel: 12, name: 'Toned Milk 500ml', openingStock: 40, purchasePrice: 22, sellingPrice: 30, sku: 'DAI-MLK-500', tax: 'GST5', unit: 'PCS' },
  { barcode: '8904002', category: 'DAI', lowStockLevel: 10, name: 'Curd Cup 200g', openingStock: 30, purchasePrice: 18, sellingPrice: 28, sku: 'DAI-CRD-200', tax: 'GST5', unit: 'PCS' },
  { barcode: '8904003', category: 'DAI', lowStockLevel: 8, name: 'Paneer 200g', openingStock: 20, purchasePrice: 60, sellingPrice: 90, sku: 'DAI-PNR-200', tax: 'GST5', unit: 'PCS' },
  { barcode: '8905001', category: 'PRO', lowStockLevel: 5, name: 'Banana', openingStock: 18, purchasePrice: 35, sellingPrice: 60, sku: 'PRO-BAN-KG', tax: 'EXEMPT', unit: 'KG' },
  { barcode: '8905002', category: 'PRO', lowStockLevel: 5, name: 'Tomato', openingStock: 15, purchasePrice: 22, sellingPrice: 40, sku: 'PRO-TOM-KG', tax: 'EXEMPT', unit: 'KG' },
  { barcode: '8906001', category: 'HOU', lowStockLevel: 10, name: 'Dish Wash Bar', openingStock: 25, purchasePrice: 15, sellingPrice: 25, sku: 'HOU-DSH-01', tax: 'GST18', unit: 'PCS' },
  { barcode: '8906002', category: 'HOU', lowStockLevel: 10, name: 'Paper Napkins Pack', openingStock: 22, purchasePrice: 30, sellingPrice: 50, sku: 'HOU-NAP-01', tax: 'GST18', unit: 'PCS' }
];

export const buildSeedProducts = (business: SeedBusinessContext): ClientProductRecord[] => {
  const now = new Date();

  return seeds.map((seed) => {
    const category = findCategory(seed.category);
    const unit = findUnit(seed.unit);
    const taxProfile = findTaxProfile(seed.tax);

    return {
      barcode: seed.barcode,
      businessCode: 'DEMO',
      businessId: business.businessId,
      businessName: business.businessName,
      categoryCode: category.code,
      categoryId: category.id,
      categoryName: category.name,
      id: `prod-${seed.sku.toLowerCase()}`,
      isActive: true,
      lowStockLevel: seed.lowStockLevel,
      name: seed.name,
      openingStock: seed.openingStock,
      purchasePrice: seed.purchasePrice,
      sellingPrice: seed.sellingPrice,
      sku: seed.sku,
      taxProfileCode: taxProfile.code,
      taxProfileId: taxProfile.id,
      taxProfileName: taxProfile.name,
      taxRateBasisPoints: taxProfile.rateBasisPoints,
      trackInventory: seed.trackInventory ?? true,
      unitCode: unit.code,
      unitId: unit.id,
      unitName: unit.name,
      unitPrecision: unit.precision,
      unitSymbol: unit.symbol,
      updatedAt: now
    };
  });
};
