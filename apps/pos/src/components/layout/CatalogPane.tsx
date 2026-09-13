import { useMemo, useState } from 'react';
import type { ClientProductRecord } from '@smart-pos/client-data';

import type { CartApi } from '../../state/use-cart.js';
import type { useProductCatalog } from '../../state/use-product-catalog.js';
import { usePosContext } from '../../state/use-pos-context.js';
import { AddEditProductModal } from '../catalog/AddEditProductModal.js';
import { CategoryTabs } from '../catalog/CategoryTabs.js';
import { ProductGrid } from '../catalog/ProductGrid.js';
import { QuickPriceEditPopover } from '../catalog/QuickPriceEditPopover.js';
import { SearchBar } from '../catalog/SearchBar.js';

type CatalogPaneProps = {
  cartApi: CartApi;
  catalog: ReturnType<typeof useProductCatalog>;
};

export const CatalogPane = ({ cartApi, catalog }: CatalogPaneProps) => {
  const { settings } = usePosContext();
  const { categories, categoryCode, filteredProducts, refresh, searchText, setCategoryCode, setSearchText, stockByProductId } =
    catalog;
  const [priceEditProduct, setPriceEditProduct] = useState<ClientProductRecord | null>(null);
  const [fullEditProduct, setFullEditProduct] = useState<ClientProductRecord | null>(null);

  const cartQuantities = useMemo(
    () => new Map(cartApi.cart.lines.map((line) => [line.productId, line.quantity])),
    [cartApi.cart.lines]
  );

  return (
    <section className="flex w-full min-w-0 flex-col gap-3 p-4 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <SearchBar onChange={setSearchText} value={searchText} />
      <CategoryTabs categories={categories} onSelect={setCategoryCode} selected={categoryCode} />
      <ProductGrid
        cartQuantities={cartQuantities}
        currencyCode={settings.currencyCode}
        onAdd={cartApi.addProduct}
        onEditPrice={setPriceEditProduct}
        onEditProduct={setFullEditProduct}
        products={filteredProducts}
        stockByProductId={stockByProductId}
      />

      {priceEditProduct && (
        <QuickPriceEditPopover
          onClose={() => setPriceEditProduct(null)}
          onSaved={(updated) => {
            setPriceEditProduct(null);
            cartApi.updatePrice(updated.id, updated.sellingPrice);
            void refresh();
          }}
          product={priceEditProduct}
        />
      )}

      {fullEditProduct && (
        <AddEditProductModal
          onClose={() => setFullEditProduct(null)}
          onSaved={(saved) => {
            setFullEditProduct(null);
            cartApi.updatePrice(saved.id, saved.sellingPrice);
            void refresh();
          }}
          product={fullEditProduct}
        />
      )}
    </section>
  );
};
