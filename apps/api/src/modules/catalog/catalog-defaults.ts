import { randomUUID } from 'node:crypto';

import type { CatalogRepository } from './catalog.repository.js';

export const defaultCategoryDefinition = { code: 'GENERAL', name: 'General' };
export const defaultTaxProfileDefinition = {
  code: 'NO-TAX',
  name: 'No Tax',
  rateBasisPoints: 0
};
export const defaultUnitDefinition = { code: 'PCS', name: 'PCS', precision: 0, symbol: 'pcs' };

export type BusinessType = 'GENERAL' | 'KIRANA' | 'RESTAURANT_DHABA' | 'VEGETABLE';

export const businessTypes: BusinessType[] = ['GENERAL', 'KIRANA', 'VEGETABLE', 'RESTAURANT_DHABA'];

type UnitDefinition = { code: string; name: string; precision: number; symbol: string };

export const businessTypeUnitDefinitions: Record<BusinessType, UnitDefinition[]> = {
  GENERAL: [defaultUnitDefinition],
  KIRANA: [
    { code: 'KG', name: 'Kilogram', precision: 3, symbol: 'kg' },
    { code: 'GRAM', name: 'Gram', precision: 0, symbol: 'g' },
    defaultUnitDefinition
  ],
  VEGETABLE: [
    { code: 'KG', name: 'Kilogram', precision: 3, symbol: 'kg' },
    { code: 'GRAM', name: 'Gram', precision: 0, symbol: 'g' },
    defaultUnitDefinition
  ],
  RESTAURANT_DHABA: [
    { code: 'PLATE', name: 'Plate', precision: 0, symbol: 'plate' },
    { code: 'HALF-PLATE', name: 'Half Plate', precision: 0, symbol: 'half' },
    { code: 'FULL-PLATE', name: 'Full Plate', precision: 0, symbol: 'full' },
    { code: 'SERVING', name: 'Serving', precision: 0, symbol: 'serving' },
    // Dhabas commonly also sell small kirana-style items (snacks, cold drinks,
    // cigarettes) priced by weight or piece, not just by plate — keep those
    // suggested too instead of forcing a trip to the fallback unit picker.
    { code: 'KG', name: 'Kilogram', precision: 3, symbol: 'kg' },
    { code: 'GRAM', name: 'Gram', precision: 0, symbol: 'g' },
    defaultUnitDefinition
  ]
};

export const ensureDefaultCategory = async (
  repository: CatalogRepository,
  tenantId: string,
  businessId: string
) => {
  const existing = await repository.findCategoryByCode(
    tenantId,
    businessId,
    defaultCategoryDefinition.code
  );
  if (existing) {
    return existing;
  }

  return repository.createCategory({
    businessId,
    code: defaultCategoryDefinition.code,
    isActive: true,
    name: defaultCategoryDefinition.name,
    tenantId
  });
};

export const ensureDefaultTaxProfile = async (
  repository: CatalogRepository,
  tenantId: string,
  businessId: string
) => {
  const existing = await repository.findTaxProfileByCode(
    tenantId,
    businessId,
    defaultTaxProfileDefinition.code
  );
  if (existing) {
    return existing;
  }

  return repository.createTaxProfile({
    businessId,
    code: defaultTaxProfileDefinition.code,
    isActive: true,
    name: defaultTaxProfileDefinition.name,
    rateBasisPoints: defaultTaxProfileDefinition.rateBasisPoints,
    tenantId
  });
};

export const ensureDefaultUnit = async (
  repository: CatalogRepository,
  tenantId: string,
  businessId: string
) => {
  const existing = await repository.findUnitByCode(
    tenantId,
    businessId,
    defaultUnitDefinition.code
  );
  if (existing) {
    return existing;
  }

  return repository.createUnit({
    businessId,
    code: defaultUnitDefinition.code,
    isActive: true,
    name: defaultUnitDefinition.name,
    precision: defaultUnitDefinition.precision,
    symbol: defaultUnitDefinition.symbol,
    tenantId
  });
};

export const ensureUnitsForBusinessType = async (
  repository: CatalogRepository,
  tenantId: string,
  businessId: string,
  businessType: string
) => {
  const definitions =
    businessTypeUnitDefinitions[businessType as BusinessType] ?? businessTypeUnitDefinitions.GENERAL;
  const units = [];

  for (const definition of definitions) {
    const existing = await repository.findUnitByCode(tenantId, businessId, definition.code);
    units.push(
      existing ??
        (await repository.createUnit({
          businessId,
          code: definition.code,
          isActive: true,
          name: definition.name,
          precision: definition.precision,
          symbol: definition.symbol,
          tenantId
        }))
    );
  }

  return units;
};

export const generateProductSku = () => `PRD-${randomUUID().split('-')[0]!.toUpperCase()}`;

export const generateScopedCode = (name: string, suffix = 0) => {
  const normalized = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28);
  const base = normalized || 'ITEM';

  return suffix > 0 ? `${base}-${suffix}`.slice(0, 32) : base.slice(0, 32);
};
