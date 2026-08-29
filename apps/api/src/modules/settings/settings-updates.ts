import { createHttpError } from '../../lib/http-error.js';
import type { CatalogRepository } from '../catalog/catalog.repository.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import { assertBranchAccess } from '../tenant-core/branch-scope.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import type { BranchRecord, BusinessRecord } from '../tenant-core/tenant-core.types.js';
import type { SettingsRepository } from './settings.repository.js';
import type { UpdateBusinessSettingsInput } from './settings.types.js';
import { isBusinessOwnedRecord } from './settings-view-loader.js';

export const hasBusinessSettingsChanges = (input: UpdateBusinessSettingsInput) =>
  input.businessLogoUrl !== undefined ||
  input.currencyCode !== undefined ||
  input.defaultTaxProfileId !== undefined ||
  input.defaultTrackInventory !== undefined ||
  input.defaultUnitId !== undefined ||
  input.invoicePrefix !== undefined ||
  input.receiptFooter !== undefined ||
  input.timezone !== undefined;

export const applyBranchSettingsUpdates = async (
  repository: SettingsRepository,
  tenantCoreRepository: TenantCoreRepository,
  context: AccessContext,
  business: BusinessRecord,
  updates: NonNullable<UpdateBusinessSettingsInput['branches']>
) => {
  const branches = await tenantCoreRepository.listBranches(context.tenantId, business.id);
  const branchMap = new Map(branches.map((branch) => [branch.id, branch] as const));

  for (const update of updates) {
    const branch = requireBranch(branchMap, update.branchId);
    assertBranchAccess(context, branch.id);

    if (update.address !== undefined) {
      await tenantCoreRepository.updateBranch(context.tenantId, branch.id, {
        address: update.address
      });
    }

    if (update.receiptPrinterProfile !== undefined) {
      await repository.upsertBranchSettings({
        branchId: branch.id,
        receiptPrinterProfile: update.receiptPrinterProfile,
        tenantId: context.tenantId
      });
    }
  }
};

export const validateConfiguredDefaults = async (
  catalogRepository: CatalogRepository,
  businessId: string,
  input: UpdateBusinessSettingsInput
) => {
  if (input.defaultTaxProfileId) {
    const taxProfile = await catalogRepository.findTaxProfileById(input.defaultTaxProfileId);
    if (!isBusinessOwnedRecord(taxProfile, businessId)) {
      throw createHttpError(404, 'TAX_PROFILE_NOT_FOUND', 'Tax profile not found');
    }
  }

  if (input.defaultUnitId) {
    const unit = await catalogRepository.findUnitById(input.defaultUnitId);
    if (!isBusinessOwnedRecord(unit, businessId)) {
      throw createHttpError(404, 'UNIT_NOT_FOUND', 'Unit not found');
    }
  }
};

export const resolveNullableUpdate = <T>(
  current: T | undefined,
  incoming: T | null | undefined
): T | null => {
  if (incoming !== undefined) {
    return incoming;
  }

  return current ?? null;
};

const requireBranch = (branchMap: Map<string, BranchRecord>, branchId: string) => {
  const branch = branchMap.get(branchId);
  if (!branch) {
    throw createHttpError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
  }

  return branch;
};
