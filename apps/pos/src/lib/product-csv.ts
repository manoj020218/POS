import type { ClientRemoteProductCreateInput, ClientRemoteProductView } from '@smart-pos/client-data';

export type ProductImportRow = {
  input: ClientRemoteProductCreateInput;
  rowNumber: number;
};

export type ProductImportError = {
  message: string;
  rowNumber: number;
};

export type ProductImportParseResult = {
  errors: ProductImportError[];
  rows: ProductImportRow[];
};

// Prices in the CSV are plain rupees (e.g. "55.00") for a shop owner to type;
// the API stores money as integer paise.
const rupeesToPaise = (value: string): number | undefined => {
  const amount = Number(value.trim());
  return Number.isFinite(amount) ? Math.round(amount * 100) : undefined;
};

const toInt = (value: string): number | undefined => {
  const amount = Number(value.trim());
  return Number.isFinite(amount) ? Math.round(amount) : undefined;
};

const toBool = (value: string): boolean => ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase());

export const parseProductImportCsv = (rows: string[][]): ProductImportParseResult => {
  const [headerRow, ...dataRows] = rows;

  if (!headerRow) {
    return { errors: [{ message: 'CSV file is empty', rowNumber: 0 }], rows: [] };
  }

  const columnIndex = new Map(headerRow.map((header, index) => [header.trim().toLowerCase(), index]));
  const nameIndex = columnIndex.get('name');
  const priceIndex = columnIndex.get('sellingprice');

  if (nameIndex === undefined || priceIndex === undefined) {
    return {
      errors: [{ message: 'CSV must include "name" and "sellingPrice" columns', rowNumber: 0 }],
      rows: []
    };
  }

  const getCell = (row: string[], column: string) => {
    const index = columnIndex.get(column);
    const value = index === undefined ? undefined : row[index]?.trim();
    return value ? value : undefined;
  };

  const errors: ProductImportError[] = [];
  const parsedRows: ProductImportRow[] = [];

  dataRows.forEach((row, offset) => {
    const rowNumber = offset + 2; // header is row 1, data starts at row 2
    if (row.every((cell) => cell.trim() === '')) {
      return;
    }

    const name = row[nameIndex]?.trim();
    const priceCell = row[priceIndex]?.trim();
    const sellingPrice = priceCell ? rupeesToPaise(priceCell) : undefined;

    if (!name) {
      errors.push({ message: 'Missing product name', rowNumber });
      return;
    }
    if (sellingPrice === undefined) {
      errors.push({ message: `Missing or invalid sellingPrice ("${priceCell ?? ''}")`, rowNumber });
      return;
    }

    const purchasePriceCell = getCell(row, 'purchaseprice');
    const openingStockCell = getCell(row, 'openingstock');
    const lowStockLevelCell = getCell(row, 'lowstocklevel');
    const trackInventoryCell = getCell(row, 'trackinventory');

    parsedRows.push({
      input: {
        barcode: getCell(row, 'barcode'),
        lowStockLevel: lowStockLevelCell ? toInt(lowStockLevelCell) : undefined,
        name,
        openingStock: openingStockCell ? toInt(openingStockCell) : undefined,
        purchasePrice: purchasePriceCell ? rupeesToPaise(purchasePriceCell) : undefined,
        sellingPrice,
        sku: getCell(row, 'sku'),
        trackInventory: trackInventoryCell ? toBool(trackInventoryCell) : undefined
      },
      rowNumber
    });
  });

  return { errors, rows: parsedRows };
};

export const productImportTemplateCsv =
  'name,sku,barcode,sellingPrice,purchasePrice,openingStock,lowStockLevel,trackInventory\r\n' +
  'Basmati Rice 1kg,RICE-1KG,8901234500012,120.00,95.00,50,5,true\r\n';

export const productsToExportRows = (products: ClientRemoteProductView[]): string[][] => {
  const header = [
    'name',
    'sku',
    'barcode',
    'sellingPrice',
    'purchasePrice',
    'openingStock',
    'lowStockLevel',
    'trackInventory',
    'isActive',
    'category',
    'unit',
    'taxProfile'
  ];

  const rows = products.map((product) => [
    product.name,
    product.sku ?? '',
    product.barcode ?? '',
    (product.sellingPrice / 100).toFixed(2),
    product.purchasePrice !== undefined ? (product.purchasePrice / 100).toFixed(2) : '',
    String(product.openingStock),
    String(product.lowStockLevel),
    product.trackInventory ? 'true' : 'false',
    product.isActive ? 'true' : 'false',
    product.categoryName,
    product.unitName,
    product.taxProfileName
  ]);

  return [header, ...rows];
};
