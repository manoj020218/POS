import { useMemo, useState } from 'react';
import type { ClientProductRecord, ClientProductVariant } from '@smart-pos/client-data';

import type { CartApi } from '../../state/use-cart.js';
import type { useProductCatalog } from '../../state/use-product-catalog.js';
import { usePosContext } from '../../state/use-pos-context.js';
import { AddEditProductModal } from '../catalog/AddEditProductModal.js';
import { CategoryTabs } from '../catalog/CategoryTabs.js';
import { FoodTypeFilter } from '../catalog/FoodTypeFilter.js';
import { ProductGrid } from '../catalog/ProductGrid.js';
import { QuickPriceEditPopover } from '../catalog/QuickPriceEditPopover.js';
import { SearchBar } from '../catalog/SearchBar.js';

type CatalogPaneProps = {
  cartApi: CartApi;
  catalog: ReturnType<typeof useProductCatalog>;
};

export const CatalogPane = ({ cartApi, catalog }: CatalogPaneProps) => {
  const { settings } = usePosContext();
  const {
    categories,
    categoryCode,
    filteredProducts,
    foodTypeFilter,
    refresh,
    searchText,
    setCategoryCode,
    setSearchText,
    stockByProductId,
    toggleFoodType
  } = catalog;
  const [priceEditProduct, setPriceEditProduct] = useState<ClientProductRecord | null>(null);
  const [fullEditProduct, setFullEditProduct] = useState<ClientProductRecord | null>(null);
  // The blocked product's id, not the message itself -- the message is
  // derived fresh from current stock/cart state on every render, so it can
  // never go stale (e.g. still showing after the cashier removes/reduces
  // the line elsewhere in the cart).
  const [blockedProductId, setBlockedProductId] = useState<string | null>(null);

  const cartQuantities = useMemo(
    () => new Map(cartApi.cart.lines.map((line) => [line.productId, line.quantity])),
    [cartApi.cart.lines]
  );

  const blockedProduct = blockedProductId
    ? filteredProducts.find((product) => product.id === blockedProductId)
    : undefined;
  const blockedAvailable = blockedProduct ? (stockByProductId.get(blockedProduct.id) ?? 0) : 0;
  const stockLimitError =
    blockedProduct && (cartQuantities.get(blockedProduct.id) ?? 0) + 1 > blockedAvailable
      ? `Only ${blockedAvailable} of "${blockedProduct.name}" in stock — can't add more.`
      : null;

  // Stop at the point of adding to cart rather than only at final checkout --
  // a cashier building a large order should find out immediately that stock
  // is short, not after ringing up everything else too.
  const handleAdd = (product: ClientProductRecord, variant?: ClientProductVariant) => {
    if (product.trackInventory) {
      const available = stockByProductId.get(product.id) ?? 0;
      const alreadyInCart = cartQuantities.get(product.id) ?? 0;
      if (alreadyInCart + 1 > available) {
        setBlockedProductId(product.id);
        return;
      }
    }

    setBlockedProductId(null);
    cartApi.addProduct(product, variant);
  };

  return (
    <section className="flex w-full min-w-0 flex-col gap-3 p-4 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <SearchBar onChange={setSearchText} value={searchText} />
      <div className="flex shrink-0 items-center gap-2">
        <CategoryTabs categories={categories} onSelect={setCategoryCode} selected={categoryCode} />
        <FoodTypeFilter active={foodTypeFilter} onToggle={toggleFoodType} />
      </div>
      {stockLimitError && (
        <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">
          {stockLimitError}
        </p>
      )}
      <ProductGrid
        cartQuantities={cartQuantities}
        currencyCode={settings.currencyCode}
        onAdd={handleAdd}
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
