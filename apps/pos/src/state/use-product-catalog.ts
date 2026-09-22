import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ClientProductRecord } from '@smart-pos/client-data';

import { usePosContext } from './use-pos-context.js';

export const allCategoryFilter = 'ALL';

export type FoodType = 'non_veg' | 'veg';

export const useProductCatalog = () => {
  const { store, terminalContext } = usePosContext();
  const [products, setProducts] = useState<ClientProductRecord[]>([]);
  const [stockByProductId, setStockByProductId] = useState<Map<string, number>>(new Map());
  const [searchText, setSearchText] = useState('');
  const [categoryCode, setCategoryCode] = useState(allCategoryFilter);
  // Empty set means no food-type filter is applied (show everything). Both
  // Veg and Non-veg can be active together -- each is an independent toggle,
  // not a 3-way switch.
  const [foodTypeFilter, setFoodTypeFilter] = useState<Set<FoodType>>(new Set());

  const toggleFoodType = useCallback((foodType: FoodType) => {
    setFoodTypeFilter((previous) => {
      const next = new Set(previous);
      if (next.has(foodType)) {
        next.delete(foodType);
      } else {
        next.add(foodType);
      }
      return next;
    });
  }, []);

  // Exposed so callers (e.g. after adding/editing a product) can force a
  // re-read from the local store without waiting for the next sync cycle.
  // Not called from the effect below directly — see its own inline fetch.
  const refresh = useCallback(async () => {
    const results = await store.products.search({
      businessId: terminalContext.businessId,
      limit: 200,
      query: ''
    });
    setProducts(results);

    const balances = await store.stock.getBalances(
      terminalContext.businessId,
      results.map((product) => product.id)
    );
    setStockByProductId(new Map(balances.map((balance) => [balance.productId, balance.quantityOnHand])));
  }, [store, terminalContext.businessId]);

  useEffect(() => {
    let cancelled = false;

    void store.products
      .search({ businessId: terminalContext.businessId, limit: 200, query: '' })
      .then(async (results) => {
        if (cancelled) {
          return;
        }
        setProducts(results);

        const balances = await store.stock.getBalances(
          terminalContext.businessId,
          results.map((product) => product.id)
        );
        if (!cancelled) {
          setStockByProductId(new Map(balances.map((balance) => [balance.productId, balance.quantityOnHand])));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [store, terminalContext.businessId]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    products.forEach((product) => seen.set(product.categoryCode, product.categoryName));
    return [...seen.entries()].map(([code, name]) => ({ code, name }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return products
      .filter((product) => categoryCode === allCategoryFilter || product.categoryCode === categoryCode)
      .filter((product) => foodTypeFilter.size === 0 || (product.foodType && foodTypeFilter.has(product.foodType)))
      .filter(
        (product) =>
          query.length === 0 ||
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          product.barcode?.toLowerCase().includes(query)
      );
  }, [products, searchText, categoryCode, foodTypeFilter]);

  return {
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
  };
};
