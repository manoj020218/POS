import { useEffect, useState } from 'react';
import type { ClientCustomerRecord } from '@smart-pos/client-data';

import { usePosContext } from './use-pos-context.js';

export const useCustomers = () => {
  const { store, terminalContext } = usePosContext();
  const [customers, setCustomers] = useState<ClientCustomerRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    void store.customers.search({ businessId: terminalContext.businessId, limit: 50 }).then((results) => {
      if (!cancelled) {
        setCustomers(results);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [store, terminalContext.businessId]);

  return customers;
};
