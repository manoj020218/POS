export type ClientCustomerRecord = {
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
  updatedAt: Date;
};

export type CustomerSearchInput = {
  businessId?: string;
  limit: number;
  query?: string;
};

export interface CustomerRepository {
  findById(customerId: string): Promise<ClientCustomerRecord | null>;
  search(input: CustomerSearchInput): Promise<ClientCustomerRecord[]>;
  upsertCustomers(customers: ClientCustomerRecord[]): Promise<void>;
}
