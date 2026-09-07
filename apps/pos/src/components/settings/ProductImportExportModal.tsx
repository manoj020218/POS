import { Download, Upload } from 'lucide-react';
import { useRef } from 'react';

import { downloadTextFile } from '../../lib/download-file.js';
import { productImportTemplateCsv } from '../../lib/product-csv.js';
import { useProductImportExport } from '../../state/use-product-import-export.js';
import { Modal } from '../common/Modal.js';

type ProductImportExportModalProps = {
  onClose: () => void;
  open: boolean;
};

export const ProductImportExportModal = ({ onClose, open }: ProductImportExportModalProps) => {
  const { error, exportCsv, exporting, importCsv, importing, progress } = useProductImportExport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = exporting || importing;

  return (
    <Modal onClose={onClose} open={open} title="Products: import / export">
      <div className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-ink">Export</h3>
          <p className="text-sm text-ink-faint">
            Download the full product catalog as a CSV file. On a tablet, save it to a connected USB
            drive from the file picker that opens, or move it there afterward from Downloads.
          </p>
          <button
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            disabled={busy}
            onClick={() => void exportCsv()}
            type="button"
          >
            <Download size={16} />
            {exporting ? 'Exporting…' : 'Download products CSV'}
          </button>
        </section>

        <section className="space-y-2 border-t border-line pt-4">
          <h3 className="text-sm font-bold text-ink">Import</h3>
          <p className="text-sm text-ink-faint">
            Pick a CSV file (from a USB drive or the device's Downloads) with at least{' '}
            <span className="font-semibold text-ink">name</span> and{' '}
            <span className="font-semibold text-ink">sellingPrice</span> columns. Existing products
            are not matched or updated — this only adds new ones.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Upload size={16} />
              {importing ? 'Importing…' : 'Choose CSV file'}
            </button>
            <button
              className="rounded-xl bg-surface-sunken px-4 py-2 text-sm font-semibold text-ink"
              onClick={() => downloadTextFile('product-import-template.csv', productImportTemplateCsv)}
              type="button"
            >
              Download template
            </button>
          </div>
          <input
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) {
                void importCsv(file);
              }
            }}
            ref={fileInputRef}
            type="file"
          />

          {progress && (
            <div className="space-y-1 rounded-xl bg-surface-sunken px-4 py-3 text-sm">
              <p className="font-semibold text-ink">
                {progress.done} / {progress.total} processed
                {progress.failed.length > 0 ? ` · ${progress.failed.length} failed` : ''}
              </p>
              {progress.failed.length > 0 && (
                <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-danger-600">
                  {progress.failed.map((failure) => (
                    <li key={failure.rowNumber}>
                      Row {failure.rowNumber}: {failure.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {error && <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">{error}</p>}
      </div>
    </Modal>
  );
};
