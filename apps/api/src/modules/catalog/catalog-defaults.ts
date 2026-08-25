import { randomUUID } from 'node:crypto';

import type { CatalogRepository } from './catalog.repository.js';

const defaultCategory = { code: 'GENERAL', name: 'General' };
const defaultTaxProfile = { code: 'NO-TAX', name: 'No Tax', rateBasisPoints: 0 };
const defaultUnit = { code: 'PCS', name: 'PCS', precision: 0, symbol: 'pcs' };

export const ensureDefaultCategory = async (
  repository: CatalogRepository,
  tenantId: string,
  businessId: string
) => {
  const existing = await repository.findCategoryByCode(
    tenantId,
    businessId,
    defaultCategory.code
  );
  if (existing) {
    return existing;
  }

  return repository.createCategory({
    businessId,
    code: defaultCategory.code,
    isActive: true,
    name: defaultCategory.name,
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
    defaultTaxProfile.code
  );
  if (existing) {
    return existing;
  }

  return repository.createTaxProfile({
    businessId,
    code: defaultTaxProfile.code,
    isActive: true,
    name: defaultTaxProfile.name,
    rateBasisPoints: defaultTaxProfile.rateBasisPoints,
    tenantId
  });
};

export const ensureDefaultUnit = async (
  repository: CatalogRepository,
  tenantId: string,
  businessId: string
) => {
  const existing = await repository.findUnitByCode(tenantId, businessId, defaultUnit.code);
  if (existing) {
    return existing;
  }

  return repository.createUnit({
    businessId,
    code: defaultUnit.code,
    isActive: true,
    name: defaultUnit.name,
    precision: defaultUnit.precision,
    symbol: defaultUnit.symbol,
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
