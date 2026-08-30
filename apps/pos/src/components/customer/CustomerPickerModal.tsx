import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import type { ClientCustomerRecord } from '@smart-pos/client-data';

import { usePosContext } from '../../state/use-pos-context.js';
import { Modal } from '../common/Modal.js';
import { SearchBar } from '../catalog/SearchBar.js';

type CustomerPickerModalProps = {
  onClose: () => void;
  onSelect: (customerId: string | null) => void;
  open: boolean;
  selectedCustomerId: string | null;
};

export const CustomerPickerModal = ({ onClose, onSelect, open, selectedCustomerId }: CustomerPickerModalProps) => {
  const { store, terminalContext } = usePosContext();
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<ClientCustomerRecord[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    void store.customers
      .search({ businessId: terminalContext.businessId, limit: 50, query })
      .then(setCustomers);
  }, [open, query, store, terminalContext.businessId]);

  return (
    <Modal onClose={onClose} open={open} title="Select customer">
      <div className="space-y-4">
        <SearchBar onChange={setQuery} value={query} />
        <div className="space-y-2">
          {customers.map((customer) => {
            const selected = customer.id === selectedCustomerId;
            return (
              <button
                className={`flex h-16 w-full items-center gap-3 rounded-2xl border px-4 text-left ${
                  selected ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface-raised active:bg-surface-sunken'
                }`}
                key={customer.id}
                onClick={() => {
                  onSelect(customer.id);
                  onClose();
                }}
                type="button"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{customer.name}</p>
                  <p className="truncate text-xs text-ink-faint">{customer.mobile ?? customer.email ?? 'No contact on file'}</p>
                </div>
                {selected && <Check size={20} className="shrink-0 text-brand-500" />}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
