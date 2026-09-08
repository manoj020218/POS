import { PackageSearch } from 'lucide-react';
import type { ClientProductRecord } from '@smart-pos/client-data';

import { ProductCard } from './ProductCard.js';

type ProductGridProps = {
  cartQuantities: Map<string, number>;
  currencyCode: string;
  onAdd: (product: ClientProductRecord) => void;
  onEditPrice: (product: ClientProductRecord) => void;
  onEditProduct: (product: ClientProductRecord) => void;
  products: ClientProductRecord[];
  stockByProductId: Map<string, number>;
};

export const ProductGrid = ({
  cartQuantities,
  currencyCode,
  onAdd,
  onEditPrice,
  onEditProduct,
  products,
  stockByProductId
}: ProductGridProps) => {
  if (products.length === 0) {
    return (
      <div className="flex min-h-[16rem] flex-col items-center justify-center gap-2 text-ink-faint lg:min-h-0 lg:flex-1">
        <PackageSearch size={40} />
        <p className="text-sm font-medium">No products match your search</p>
      </div>
    );
  }

  return (
    <div className="grid auto-rows-min grid-cols-2 gap-3 p-2 pt-3 sm:grid-cols-3 xl:grid-cols-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      {products.map((product) => (
        <ProductCard
          currencyCode={currencyCode}
          key={product.id}
          onAdd={() => onAdd(product)}
          onEditPrice={() => onEditPrice(product)}
          onEditProduct={() => onEditProduct(product)}
          product={product}
          quantityInCart={cartQuantities.get(product.id) ?? 0}
          quantityOnHand={stockByProductId.get(product.id)}
        />
      ))}
    </div>
  );
};
