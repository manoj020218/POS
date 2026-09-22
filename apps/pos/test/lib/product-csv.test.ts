import type { ClientRemoteProductView } from '@smart-pos/client-data';
import { describe, expect, it } from 'vitest';

import { parseProductImportCsv, productsToExportRows } from '../../src/lib/product-csv.js';

describe('parseProductImportCsv', () => {
  it('parses a valid row into a createProduct input, converting rupees to paise', () => {
    const result = parseProductImportCsv([
      ['name', 'sku', 'barcode', 'sellingPrice', 'purchasePrice', 'openingStock', 'lowStockLevel', 'trackInventory'],
      ['Basmati Rice 1kg', 'RICE-1KG', '8901234500012', '120.00', '95.50', '50', '5', 'true']
    ]);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toEqual([
      {
        input: {
          barcode: '8901234500012',
          lowStockLevel: 5,
          name: 'Basmati Rice 1kg',
          openingStock: 50,
          purchasePrice: 9550,
          sellingPrice: 12000,
          sku: 'RICE-1KG',
          trackInventory: true
        },
        rowNumber: 2
      }
    ]);
  });

  it('is case-insensitive on headers and tolerates a reordered/minimal column set', () => {
    const result = parseProductImportCsv([
      ['SELLINGPRICE', 'Name'],
      ['25', 'Salt 1kg']
    ]);

    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]?.input).toEqual({
      barcode: undefined,
      lowStockLevel: undefined,
      name: 'Salt 1kg',
      openingStock: undefined,
      purchasePrice: undefined,
      sellingPrice: 2500,
      sku: undefined,
      trackInventory: undefined
    });
  });

  it('reports a row-level error for a missing name without aborting other rows', () => {
    const result = parseProductImportCsv([
      ['name', 'sellingPrice'],
      ['', '10'],
      ['Salt 1kg', '25']
    ]);

    expect(result.errors).toEqual([{ message: 'Missing product name', rowNumber: 2 }]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.input.name).toBe('Salt 1kg');
  });

  it('reports a row-level error for a missing or non-numeric sellingPrice', () => {
    const result = parseProductImportCsv([
      ['name', 'sellingPrice'],
      ['Salt 1kg', 'free']
    ]);

    expect(result.errors).toEqual([{ message: 'Missing or invalid sellingPrice ("free")', rowNumber: 2 }]);
    expect(result.rows).toHaveLength(0);
  });

  it('skips fully blank rows silently', () => {
    const result = parseProductImportCsv([
      ['name', 'sellingPrice'],
      ['', ''],
      ['Salt 1kg', '25']
    ]);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
  });

  it('fails fast when the header is missing required columns', () => {
    const result = parseProductImportCsv([['name', 'price'], ['Salt', '25']]);

    expect(result.errors).toEqual([
      { message: 'CSV must include "name" and "sellingPrice" columns', rowNumber: 0 }
    ]);
    expect(result.rows).toHaveLength(0);
  });

  it('reports an error for a completely empty file', () => {
    expect(parseProductImportCsv([])).toEqual({
      errors: [{ message: 'CSV file is empty', rowNumber: 0 }],
      rows: []
    });
  });
});

describe('productsToExportRows', () => {
  it('converts paise back to a two-decimal rupee string and includes readable master-data names', () => {
    const product: ClientRemoteProductView = {
      barcode: '890123',
      businessCode: 'DEMO',
      businessId: 'business-1',
      businessName: 'Demo Store',
      categoryCode: 'GENERAL',
      categoryId: 'cat-1',
      categoryName: 'General',
      id: 'product-1',
      isActive: true,
      lowStockLevel: 5,
      name: 'Basmati Rice 1kg',
      openingStock: 50,
      purchasePrice: 9550,
      sellingPrice: 12000,
      sku: 'RICE-1KG',
      taxProfileCode: 'GST-5',
      taxProfileId: 'tax-1',
      taxProfileName: 'GST 5%',
      taxRateBasisPoints: 500,
      trackInventory: true,
      unitCode: 'PCS',
      unitId: 'unit-1',
      unitName: 'Pieces',
      unitPrecision: 0,
      variants: []
    };

    const rows = productsToExportRows([product]);

    expect(rows[0]).toEqual([
      'name',
      'sku',
      'barcode',
      'sellingPrice',
      'purchasePrice',
      'openingStock',
      'lowStockLevel',
      'trackInventory',
      'isActive',
      'category',
      'unit',
      'taxProfile'
    ]);
    expect(rows[1]).toEqual([
      'Basmati Rice 1kg',
      'RICE-1KG',
      '890123',
      '120.00',
      '95.50',
      '50',
      '5',
      'true',
      'true',
      'General',
      'Pieces',
      'GST 5%'
    ]);
  });
});
