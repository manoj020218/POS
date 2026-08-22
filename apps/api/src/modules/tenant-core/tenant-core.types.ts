export type TenantRecord = {
  createdAt: Date;
  id: string;
  isActive: boolean;
  name: string;
  slug: string;
  updatedAt: Date;
};

export type BusinessRecord = {
  code: string;
  createdAt: Date;
  id: string;
  name: string;
  tenantId: string;
  updatedAt: Date;
};

export type BranchRecord = {
  address?: string;
  businessId: string;
  code: string;
  createdAt: Date;
  id: string;
  isActive: boolean;
  name: string;
  tenantId: string;
  updatedAt: Date;
};

export type TerminalRecord = {
  branchId: string;
  code: string;
  createdAt: Date;
  deviceInstallationId?: string;
  id: string;
  isActive: boolean;
  lastSeenAt?: Date;
  name: string;
  tenantId: string;
  updatedAt: Date;
};

export type CreateTenantInput = Pick<TenantRecord, 'id' | 'name' | 'slug'>;
export type CreateBusinessInput = Pick<BusinessRecord, 'code' | 'name' | 'tenantId'>;
export type UpdateBusinessInput = Partial<Pick<BusinessRecord, 'code' | 'name'>>;
export type CreateBranchInput = Pick<BranchRecord, 'address' | 'businessId' | 'code' | 'name' | 'tenantId'>;
export type UpdateBranchInput = Partial<Pick<BranchRecord, 'address' | 'code' | 'isActive' | 'name'>>;
export type RegisterTerminalInput = Pick<
  TerminalRecord,
  'branchId' | 'code' | 'deviceInstallationId' | 'name' | 'tenantId'
>;
