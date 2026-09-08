import { useMemo } from 'react';

import { useProductCatalog } from '../../state/use-product-catalog.js';
import type { CartApi } from '../../state/use-cart.js';
import { usePosContext } from '../../state/use-pos-context.js';
import { CategoryTabs } from '../catalog/CategoryTabs.js';
import { ProductGrid } from '../catalog/ProductGrid.js';
import { SearchBar } from '../catalog/SearchBar.js';

export const CatalogPane = ({ cartApi }: { cartApi: CartApi }) => {
  const { settings } = usePosContext();
  const { categories, categoryCode, filteredProducts, searchText, setCategoryCode, setSearchText, stockByProductId } =
    useProductCatalog();

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
        products={filteredProducts}
        stockByProductId={stockByProductId}
      />
    </section>
  );
};
