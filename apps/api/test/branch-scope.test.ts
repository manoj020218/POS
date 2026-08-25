import { describe, expect, it } from 'vitest';

import {
  assertAllBranchAccess,
  assertBranchAccess,
  filterByBranchId,
  filterBusinessesForBranchScope
} from '../src/modules/tenant-core/branch-scope.js';
import type { AccessContext } from '../src/modules/tenant-core/access-context.js';
import type { BranchRecord, BusinessRecord } from '../src/modules/tenant-core/tenant-core.types.js';

const assignedContext: AccessContext = {
  assignedBranchIds: ['branch-a'],
  hasAllBranchAccess: false,
  role: 'CASHIER',
  tenantId: 'tenant-a',
  userId: 'user-a'
};

const ownerContext: AccessContext = {
  assignedBranchIds: ['branch-a'],
  hasAllBranchAccess: true,
  role: 'BUSINESS_OWNER',
  tenantId: 'tenant-a',
  userId: 'user-b'
};

describe('branch scope helpers', () => {
  it('allows tenant-wide callers and assigned branch ids', () => {
    expect(() => assertAllBranchAccess(ownerContext)).not.toThrow();
    expect(() => assertBranchAccess(assignedContext, 'branch-a')).not.toThrow();
  });

  it('denies unassigned branch ids for restricted callers', () => {
    expect(thrownError(() => assertAllBranchAccess(assignedContext))).toMatchObject({
      code: 'BRANCH_ACCESS_DENIED',
      statusCode: 403
    });
    expect(thrownError(() => assertBranchAccess(assignedContext, 'branch-b'))).toMatchObject({
      code: 'BRANCH_ACCESS_DENIED',
      statusCode: 403
    });
  });

  it('filters records and businesses to assigned branches', () => {
    const branches = [
      { id: 'branch-a', businessId: 'biz-1' },
      { id: 'branch-b', businessId: 'biz-2' }
    ];
    const businesses = [
      { id: 'biz-1' },
      { id: 'biz-2' }
    ] as BusinessRecord[];

    expect(filterByBranchId(assignedContext, branches, (branch) => branch.id)).toEqual([
      branches[0]
    ]);
    expect(
      filterBusinessesForBranchScope(assignedContext, businesses, branches as BranchRecord[])
    ).toEqual([businesses[0]]);
    expect(filterByBranchId(ownerContext, branches, (branch) => branch.id)).toEqual(branches);
  });
});

const thrownError = (callback: () => void) => {
  try {
    callback();
  } catch (error) {
    return error;
  }

  throw new Error('Expected callback to throw');
};
