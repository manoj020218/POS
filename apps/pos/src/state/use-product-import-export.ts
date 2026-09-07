import type { ClientRemoteProductView } from '@smart-pos/client-data';
import { useState } from 'react';

import { downloadTextFile } from '../lib/download-file.js';
import { parseCsv, toCsv } from '../lib/csv.js';
import { parseProductImportCsv, productsToExportRows } from '../lib/product-csv.js';
import { usePosContext } from './use-pos-context.js';

export type ImportProgress = {
  done: number;
  failed: Array<{ message: string; rowNumber: number }>;
  total: number;
};

const toMessage = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback);

export const useProductImportExport = () => {
  const { remoteApi, terminalContext } = usePosContext();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportCsv = async () => {
    setError(null);
    setExporting(true);
    try {
      const items: ClientRemoteProductView[] = [];
      let page = 1;

      for (;;) {
        const result = await remoteApi.listProducts({
          businessId: terminalContext.businessId,
          page,
          pageSize: 100
        });
        items.push(...result.items);
        if (!result.meta.hasNextPage) {
          break;
        }
        page += 1;
      }

      const filename = `products-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadTextFile(filename, toCsv(productsToExportRows(items)));
    } catch (cause) {
      setError(toMessage(cause, 'Could not export products'));
    } finally {
      setExporting(false);
    }
  };

  const importCsv = async (file: File) => {
    setError(null);
    setImporting(true);
    setProgress(null);

    try {
      const text = await file.text();
      const { errors, rows } = parseProductImportCsv(parseCsv(text));

      if (rows.length === 0) {
        setError(errors[0]?.message ?? 'This CSV file has no importable rows');
        return;
      }

      const failed: ImportProgress['failed'] = errors.map((issue) => ({
        message: issue.message,
        rowNumber: issue.rowNumber
      }));
      let done = 0;
      setProgress({ done, failed, total: rows.length });

      for (const row of rows) {
        try {
          await remoteApi.createProduct({ ...row.input, businessId: terminalContext.businessId });
        } catch (cause) {
          failed.push({ message: toMessage(cause, 'Failed to create product'), rowNumber: row.rowNumber });
        }

        done += 1;
        setProgress({ done, failed: [...failed], total: rows.length });
      }
    } catch (cause) {
      setError(toMessage(cause, 'Could not read this CSV file'));
    } finally {
      setImporting(false);
    }
  };

  return { error, exportCsv, exporting, importCsv, importing, progress };
};
