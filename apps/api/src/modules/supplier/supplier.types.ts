export type SupplierRecord = {
  address?: string;
  businessId: string;
  createdAt: Date;
  email?: string;
  id: string;
  isActive: boolean;
  mobile?: string;
  name: string;
  notes?: string;
  taxNumber?: string;
  tenantId: string;
  updatedAt: Date;
};

export type CreateSupplierInput = Omit<SupplierRecord, 'createdAt' | 'id' | 'updatedAt'>;
export type UpdateSupplierInput = Partial<
  Pick<SupplierRecord, 'address' | 'email' | 'isActive' | 'mobile' | 'name' | 'notes' | 'taxNumber'>
>;

export type SupplierQuery = {
  businessId?: string;
  query?: string;
};

export type SupplierView = {
  address?: string;
  businessCode: string;
  businessId: string;
  businessName: string;
  email?: string;
  id: string;
  isActive: boolean;
  mobile?: string;
  name: string;
  notes?: string;
  taxNumber?: string;
};
