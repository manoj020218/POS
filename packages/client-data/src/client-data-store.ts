import type { CustomerRepository } from './customer-repository.js';
import type { ProductRepository } from './product-repository.js';
import type { SaleRepository } from './sale-repository.js';
import type { SettingsRepository } from './settings-repository.js';
import type { StockRepository } from './stock-repository.js';
import type { SyncRepository } from './sync-repository.js';

export type ClientDataStore = {
  customers: CustomerRepository;
  products: ProductRepository;
  sales: SaleRepository;
  settings: SettingsRepository;
  stock: StockRepository;
  sync: SyncRepository;
};
