export type CustomerRecord = {
  address?: string;
  businessId: string;
  createdAt: Date;
  email?: string;
  id: string;
  isActive: boolean;
  isWalkIn: boolean;
  mobile?: string;
  name: string;
  notes?: string;
  taxNumber?: string;
  tenantId: string;
  updatedAt: Date;
};

export type CreateCustomerInput = Omit<CustomerRecord, 'createdAt' | 'id' | 'updatedAt'>;

export type UpdateCustomerInput = Partial<
  Pick<CustomerRecord, 'address' | 'email' | 'isActive' | 'mobile' | 'name' | 'notes' | 'taxNumber'>
>;

export type CustomerQuery = {
  businessId?: string;
  query?: string;
};

export type CustomerView = {
  address?: string;
  businessCode: string;
  businessId: string;
  businessName: string;
  email?: string;
  id: string;
  isActive: boolean;
  isWalkIn: boolean;
  mobile?: string;
  name: string;
  notes?: string;
  taxNumber?: string;
};
