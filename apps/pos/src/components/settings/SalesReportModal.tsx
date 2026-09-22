import { Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  ClientPaymentMethodSummaryRow,
  ClientSalesBreakdownView,
  ClientSalesSummaryView,
  ClientTopProductsView
} from '@smart-pos/client-data';

import { formatMoney } from '../../lib/currency.js';
import { buildSalesReportCsv } from '../../lib/sales-report-csv.js';
import { shareTextFile } from '../../lib/share-file.js';
import { usePosContext } from '../../state/use-pos-context.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';

type SalesReportModalProps = {
  onClose: () => void;
  open: boolean;
};

type RangePreset = 'CUSTOM' | 'MONTH' | 'TODAY';

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const firstOfMonth = () => {
  const now = new Date();
  return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
};

type ReportData = {
  paymentBreakdown: ClientSalesBreakdownView<ClientPaymentMethodSummaryRow>;
  summary: ClientSalesSummaryView;
  topProducts: ClientTopProductsView;
};

export const SalesReportModal = ({ onClose, open }: SalesReportModalProps) => {
  const { remoteApi, settings } = usePosContext();
  const [preset, setPreset] = useState<RangePreset>('TODAY');
  const [customFrom, setCustomFrom] = useState(firstOfMonth());
  const [customTo, setCustomTo] = useState(toDateInputValue(new Date()));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateFrom = preset === 'TODAY' ? undefined : preset === 'MONTH' ? firstOfMonth() : customFrom;
  const dateTo = preset === 'TODAY' ? undefined : preset === 'MONTH' ? toDateInputValue(new Date()) : customTo;
  const rangeReady = preset !== 'CUSTOM' || (customFrom.length > 0 && customTo.length > 0);

  useEffect(() => {
    if (!open || !rangeReady) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const query = { dateFrom, dateTo };
    Promise.all([
      remoteApi.getSalesSummary(query),
      remoteApi.listSalesByPaymentMethod(query),
      remoteApi.listTopProducts({ ...query, limit: 10 })
    ])
      .then(([summary, paymentBreakdown, topProducts]) => {
        if (!cancelled) {
          setData({ paymentBreakdown, summary, topProducts });
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load the report');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preset, dateFrom, dateTo, rangeReady]);

  if (!open) {
    return null;
  }

  const share = async () => {
    if (!data) {
      return;
    }

    setSharing(true);
    setError(null);
    try {
      const csv = buildSalesReportCsv({
        businessName: settings.businessName,
        generatedAt: new Date(),
        paymentBreakdown: data.paymentBreakdown,
        summary: data.summary,
        topProducts: data.topProducts
      });

      await shareTextFile({
        contents: csv,
        dialogTitle: 'Sales report',
        filename: `sales-report-${data.summary.dateFrom}-to-${data.summary.dateTo}.csv`
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not share the report');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal onClose={onClose} open={open} title="Sales report" widthClassName="max-w-lg">
      <div className="space-y-5">
        <div className="flex gap-2">
          {(['TODAY', 'MONTH', 'CUSTOM'] as const).map((option) => (
            <button
              className={`h-10 flex-1 rounded-xl text-sm font-bold transition-colors ${
                preset === option ? 'bg-brand-500 text-white' : 'bg-surface-sunken text-ink-muted'
              }`}
              key={option}
              onClick={() => setPreset(option)}
              type="button"
            >
              {option === 'TODAY' ? 'Today' : option === 'MONTH' ? 'This month' : 'Custom'}
            </button>
          ))}
        </div>

        {preset === 'CUSTOM' && (
          <div className="flex gap-2">
            <input
              className="h-11 flex-1 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
              max={customTo}
              onChange={(event) => setCustomFrom(event.target.value)}
              type="date"
              value={customFrom}
            />
            <input
              className="h-11 flex-1 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
              min={customFrom}
              onChange={(event) => setCustomTo(event.target.value)}
              type="date"
              value={customTo}
            />
          </div>
        )}

        {loading && <p className="py-6 text-center text-sm text-ink-faint">Loading…</p>}

        {error && <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">{error}</p>}

        {!loading && data && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-surface-sunken p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Total sales</p>
                <p className="text-lg font-extrabold text-ink">
                  {formatMoney(data.summary.totalAmount, settings.currencyCode)}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-sunken p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Sale count</p>
                <p className="text-lg font-extrabold text-ink">{data.summary.saleCount}</p>
              </div>
              <div className="rounded-2xl bg-surface-sunken p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Tax collected</p>
                <p className="text-lg font-extrabold text-ink">
                  {formatMoney(data.summary.taxAmount, settings.currencyCode)}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-sunken p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Avg. sale</p>
                <p className="text-lg font-extrabold text-ink">
                  {formatMoney(data.summary.averageSaleAmount, settings.currencyCode)}
                </p>
              </div>
            </div>

            {data.paymentBreakdown.rows.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">By payment method</p>
                <div className="divide-y divide-line rounded-2xl border border-line">
                  {data.paymentBreakdown.rows.map((row) => (
                    <div className="flex items-center justify-between px-3 py-2 text-sm" key={row.paymentMethod}>
                      <span className="font-semibold text-ink">
                        {row.paymentMethod} <span className="text-ink-faint">× {row.saleCount}</span>
                      </span>
                      <span className="font-bold text-ink">
                        {formatMoney(row.totalAmount, settings.currencyCode)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.topProducts.rows.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">Top products</p>
                <div className="divide-y divide-line rounded-2xl border border-line">
                  {data.topProducts.rows.map((row) => (
                    <div className="flex items-center justify-between px-3 py-2 text-sm" key={row.productId}>
                      <span className="truncate font-semibold text-ink">
                        {row.productName} <span className="text-ink-faint">× {row.totalQuantity}</span>
                      </span>
                      <span className="font-bold text-ink">
                        {formatMoney(row.totalAmount, settings.currencyCode)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <Button disabled={!data || sharing} fullWidth icon={<Share2 size={18} />} onClick={() => void share()} variant="brand">
          {sharing ? 'Preparing…' : 'Share report (CSV)'}
        </Button>
      </div>
    </Modal>
  );
};
