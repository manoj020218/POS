import type { CatalogRepository } from '../catalog/catalog.repository.js';
import { resolveWriteBusiness } from '../catalog/catalog-business-scope.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { defaultBusinessSettings } from './settings-defaults.js';
import type { SettingsRepository } from './settings.repository.js';
import type {
  BusinessSettingsQuery,
  BusinessSettingsView,
  UpdateBusinessSettingsInput
} from './settings.types.js';
import {
  applyBranchSettingsUpdates,
  hasBusinessSettingsChanges,
  resolveNullableUpdate,
  validateConfiguredDefaults
} from './settings-updates.js';
import { loadBusinessSettingsView } from './settings-view-loader.js';

export const createSettingsService = (
  repository: SettingsRepository,
  catalogRepository: CatalogRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  getBusinessSettings: async (
    context: AccessContext,
    query: BusinessSettingsQuery
  ): Promise<BusinessSettingsView> => {
    const business = await resolveWriteBusiness(context, tenantCoreRepository, query.businessId);
    return loadBusinessSettingsView(
      repository,
      catalogRepository,
      tenantCoreRepository,
      context.tenantId,
      business
    );
  },
  updateBusinessSettings: async (
    context: AccessContext,
    input: UpdateBusinessSettingsInput
  ): Promise<BusinessSettingsView> => {
    const business = await resolveWriteBusiness(context, tenantCoreRepository, input.businessId);
    const current = await repository.findBusinessSettingsByBusinessId(context.tenantId, business.id);

    if (hasBusinessSettingsChanges(input)) {
      await validateConfiguredDefaults(catalogRepository, business.id, input);
      await repository.upsertBusinessSettings({
        businessId: business.id,
        businessLogoUrl: resolveNullableUpdate(current?.businessLogoUrl, input.businessLogoUrl),
        currencyCode: input.currencyCode ?? current?.currencyCode ?? defaultBusinessSettings.currencyCode,
        defaultTaxProfileId: resolveNullableUpdate(
          current?.defaultTaxProfileId,
          input.defaultTaxProfileId
        ),
        defaultTrackInventory:
          input.defaultTrackInventory ??
          current?.defaultTrackInventory ??
          defaultBusinessSettings.defaultTrackInventory,
        defaultUnitId: resolveNullableUpdate(current?.defaultUnitId, input.defaultUnitId),
        invoicePrefix:
          input.invoicePrefix ?? current?.invoicePrefix ?? defaultBusinessSettings.invoicePrefix,
        receiptFooter: resolveNullableUpdate(current?.receiptFooter, input.receiptFooter),
        tenantId: context.tenantId,
        timezone: input.timezone ?? current?.timezone ?? defaultBusinessSettings.timezone
      });
    }

    if (input.branches) {
      await applyBranchSettingsUpdates(
        repository,
        tenantCoreRepository,
        context,
        business,
        input.branches
      );
    }

    return loadBusinessSettingsView(
      repository,
      catalogRepository,
      tenantCoreRepository,
      context.tenantId,
      business
    );
  }
});
