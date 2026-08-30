import { useEffect, useMemo, useState } from 'react';
import type { ClientProductRecord } from '@smart-pos/client-data';

import { usePosContext } from './use-pos-context.js';

export const allCategoryFilter = 'ALL';

export const useProductCatalog = () => {
  const { store, terminalContext } = usePosContext();
  const [products, setProducts] = useState<ClientProductRecord[]>([]);
  const [stockByProductId, setStockByProductId] = useState<Map<string, number>>(new Map());
  const [searchText, setSearchText] = useState('');
  const [categoryCode, setCategoryCode] = useState(allCategoryFilter);

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
      .filter(
        (product) =>
          query.length === 0 ||
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          product.barcode?.toLowerCase().includes(query)
      );
  }, [products, searchText, categoryCode]);

  return {
    categories,
    categoryCode,
    filteredProducts,
    searchText,
    setCategoryCode,
    setSearchText,
    stockByProductId
  };
};
