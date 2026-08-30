export const demoCategories = [
  { code: 'BEV', id: 'cat-beverages', name: 'Beverages' },
  { code: 'BAK', id: 'cat-bakery', name: 'Bakery' },
  { code: 'SNK', id: 'cat-snacks', name: 'Snacks' },
  { code: 'DAI', id: 'cat-dairy', name: 'Dairy' },
  { code: 'PRO', id: 'cat-produce', name: 'Produce' },
  { code: 'HOU', id: 'cat-household', name: 'Household' }
] as const;

export const demoUnits = [
  { code: 'PCS', id: 'unit-pcs', name: 'Piece', precision: 0, symbol: 'pc' },
  { code: 'KG', id: 'unit-kg', name: 'Kilogram', precision: 2, symbol: 'kg' },
  { code: 'LTR', id: 'unit-ltr', name: 'Litre', precision: 2, symbol: 'L' }
] as const;

export const demoTaxProfiles = [
  { code: 'EXEMPT', id: 'tax-exempt', name: 'Exempt', rateBasisPoints: 0 },
  { code: 'GST5', id: 'tax-gst5', name: 'GST 5%', rateBasisPoints: 500 },
  { code: 'GST12', id: 'tax-gst12', name: 'GST 12%', rateBasisPoints: 1200 },
  { code: 'GST18', id: 'tax-gst18', name: 'GST 18%', rateBasisPoints: 1800 }
] as const;

export type DemoCategoryCode = (typeof demoCategories)[number]['code'];
export type DemoUnitCode = (typeof demoUnits)[number]['code'];
export type DemoTaxCode = (typeof demoTaxProfiles)[number]['code'];

export const findCategory = (code: DemoCategoryCode) =>
  demoCategories.find((category) => category.code === code)!;

export const findUnit = (code: DemoUnitCode) => demoUnits.find((unit) => unit.code === code)!;

export const findTaxProfile = (code: DemoTaxCode) =>
  demoTaxProfiles.find((profile) => profile.code === code)!;
