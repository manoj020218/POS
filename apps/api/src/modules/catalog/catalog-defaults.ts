import { randomUUID } from 'node:crypto';

import type { CatalogRepository } from './catalog.repository.js';

export const defaultCategoryDefinition = { code: 'GENERAL', name: 'General' };
export const defaultTaxProfileDefinition = {
  code: 'NO-TAX',
  name: 'No Tax',
  rateBasisPoints: 0
};
export const defaultUnitDefinition = { code: 'PCS', name: 'PCS', precision: 0, symbol: 'pcs' };

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
