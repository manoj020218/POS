import type {
  CatalogUpdatedSinceInput,
  CategoryRecord,
  TaxProfileRecord,
  UnitRecord
} from './catalog.types.js';

type MasterRecord = CategoryRecord | TaxProfileRecord | UnitRecord;
type ScopedRecord = {
  businessId: string;
  tenantId: string;
};
type UpdatedRecord = ScopedRecord & {
  id: string;
  updatedAt: Date;
};

export const byBusiness = <T extends ScopedRecord>(
  items: Iterable<T>,
  tenantId: string,
  businessIds?: string[]
) => {
  const allowed = businessIds ? new Set(businessIds) : null;
  return [...items].filter(
    (item) => item.tenantId === tenantId && (!allowed || allowed.has(item.businessId))
  );
};

export const byCodeThenName = (
  left: { code: string; name: string },
  right: { code: string; name: string }
) => left.code.localeCompare(right.code) || left.name.localeCompare(right.name);

export const findMasterByCode = <T extends MasterRecord>(
  items: Iterable<T>,
  tenantId: string,
  businessId: string,
  code: string
) =>
  [...items].find(
    (item) =>
      item.tenantId === tenantId && item.businessId === businessId && item.code === code
  ) ?? null;

export const listUpdatedRecordsSince = <T extends UpdatedRecord>(
  items: Iterable<T>,
  tenantId: string,
  businessIds: string[],
  input: CatalogUpdatedSinceInput,
  buildChangeKey: (id: string) => string
) =>
  byBusiness(items, tenantId, businessIds)
    .filter((item) => isAfterCursor(item, input.cursor, buildChangeKey))
    .sort((left, right) => compareUpdatedRecords(left, right, buildChangeKey))
    .slice(0, input.limit);

export const updateRecord = <T extends { id: string; tenantId: string; updatedAt: Date }>(
  map: Map<string, T>,
  id: string,
  tenantId: string,
  input: Partial<T>
): T | null => {
  const existing = map.get(id);
  if (!existing || existing.tenantId !== tenantId) {
    return null;
  }

  const updated = { ...existing, ...input, updatedAt: new Date() };
  map.set(id, updated);
  return updated;
};

const compareUpdatedRecords = <T extends UpdatedRecord>(
  left: T,
  right: T,
  buildChangeKey: (id: string) => string
) =>
  left.updatedAt.getTime() - right.updatedAt.getTime() ||
  buildChangeKey(left.id).localeCompare(buildChangeKey(right.id));

const isAfterCursor = <T extends UpdatedRecord>(
  item: T,
  cursor: CatalogUpdatedSinceInput['cursor'],
  buildChangeKey: (id: string) => string
) => {
  if (!cursor) {
    return true;
  }

  return (
    item.updatedAt.getTime() > cursor.updatedAt.getTime() ||
    (item.updatedAt.getTime() === cursor.updatedAt.getTime() &&
      buildChangeKey(item.id).localeCompare(cursor.changeKey) > 0)
  );
};
