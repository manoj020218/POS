export type BusinessType = 'GENERAL' | 'KIRANA' | 'RESTAURANT_DHABA' | 'VEGETABLE';

export const businessTypeOptions: Array<{ label: string; value: BusinessType }> = [
  { label: 'General store', value: 'GENERAL' },
  { label: 'Kirana / general retail', value: 'KIRANA' },
  { label: 'Vegetable vendor', value: 'VEGETABLE' },
  { label: 'Dhaba / restaurant', value: 'RESTAURANT_DHABA' }
];

export type SuggestedUnit = { code: string; name: string };

// Mirrors apps/api/src/modules/catalog/catalog-defaults.ts's businessTypeUnitDefinitions —
// keep both lists in sync if either changes.
export const suggestedUnitsByBusinessType: Record<BusinessType, SuggestedUnit[]> = {
  GENERAL: [{ code: 'PCS', name: 'PCS' }],
  KIRANA: [
    { code: 'KG', name: 'Kilogram' },
    { code: 'GRAM', name: 'Gram' },
    { code: 'PCS', name: 'PCS' }
  ],
  VEGETABLE: [
    { code: 'KG', name: 'Kilogram' },
    { code: 'GRAM', name: 'Gram' },
    { code: 'PCS', name: 'PCS' }
  ],
  RESTAURANT_DHABA: [
    { code: 'PLATE', name: 'Plate' },
    { code: 'HALF-PLATE', name: 'Half Plate' },
    { code: 'FULL-PLATE', name: 'Full Plate' },
    { code: 'SERVING', name: 'Serving' },
    { code: 'KG', name: 'Kilogram' },
    { code: 'GRAM', name: 'Gram' },
    { code: 'PCS', name: 'PCS' }
  ]
};

export const suggestedUnitsFor = (businessType: string): SuggestedUnit[] =>
  suggestedUnitsByBusinessType[businessType as BusinessType] ?? suggestedUnitsByBusinessType.GENERAL;
