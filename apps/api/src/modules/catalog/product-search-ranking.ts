import type { ProductRecord } from './catalog.types.js';

const normalize = (value: string) => value.trim().toLowerCase();

export const rankProductsForSearch = (products: ProductRecord[], query: string) => {
  const normalizedQuery = normalize(query);
  const exactBarcodeMatches = products.filter(
    (product) => product.isActive && product.barcode?.trim() === query.trim()
  );
  if (exactBarcodeMatches.length > 0) {
    return exactBarcodeMatches.sort(byNameThenSku);
  }

  return products
    .filter((product) => product.isActive)
    .map((product) => ({ product, score: searchScore(product, normalizedQuery) }))
    .filter(hasScore)
    .sort((left, right) => left.score - right.score || byNameThenSku(left.product, right.product))
    .map((item) => item.product);
};

const searchScore = (product: ProductRecord, query: string) => {
  const barcode = normalize(product.barcode ?? '');
  const name = normalize(product.name);
  const sku = normalize(product.sku);

  if (sku === query) return 0;
  if (name === query) return 1;
  if (sku.startsWith(query)) return 2;
  if (name.startsWith(query)) return 3;
  if (barcode.includes(query)) return 4;
  if (sku.includes(query)) return 5;
  if (name.includes(query)) return 6;
  return null;
};

const byNameThenSku = (left: ProductRecord, right: ProductRecord) =>
  left.name.localeCompare(right.name) || left.sku.localeCompare(right.sku);

const hasScore = (
  item: { product: ProductRecord; score: number | null }
): item is { product: ProductRecord; score: number } => item.score !== null;
