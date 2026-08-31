import type { InMemoryCatalogRepository } from '../modules/catalog/in-memory-catalog.repository.js';

type SeedDevCatalogInput = {
  businessId: string;
  catalogRepository: InMemoryCatalogRepository;
  tenantId: string;
};

const products = [
  { barcode: '8901001', name: 'Filter Coffee 200ml', price: 3000, sku: 'BEV-COF-200' },
  { barcode: '8902001', name: 'Butter Croissant', price: 5500, sku: 'BAK-CRO-01' },
  { barcode: '8903001', name: 'Potato Chips 90g', price: 2500, sku: 'SNK-CHP-90' },
  { barcode: '8904001', name: 'Toned Milk 500ml', price: 3000, sku: 'DAI-MLK-500' }
];

export const seedDevCatalog = async ({ businessId, catalogRepository, tenantId }: SeedDevCatalogInput) => {
  const category = await catalogRepository.createCategory({
    businessId,
    code: 'GENERAL',
    isActive: true,
    name: 'General',
    tenantId
  });
  const unit = await catalogRepository.createUnit({
    businessId,
    code: 'PCS',
    isActive: true,
    name: 'Piece',
    precision: 0,
    symbol: 'pc',
    tenantId
  });
  const taxProfile = await catalogRepository.createTaxProfile({
    businessId,
    code: 'GST12',
    isActive: true,
    name: 'GST 12%',
    rateBasisPoints: 1200,
    tenantId
  });

  await Promise.all(
    products.map((product) =>
      catalogRepository.createProduct({
        barcode: product.barcode,
        businessId,
        categoryId: category.id,
        isActive: true,
        lowStockLevel: 5,
        name: product.name,
        openingStock: 50,
        sellingPrice: product.price,
        sku: product.sku,
        taxProfileId: taxProfile.id,
        tenantId,
        trackInventory: true,
        unitId: unit.id
      })
    )
  );
};
