import { useCallback, useEffect, useState } from 'react';

import type { CartState } from './cart-types.js';
import type { HeldBill } from './held-bill-types.js';
import { usePosContext } from './use-pos-context.js';

const storageKey = (terminalId: string) => `smartpos.heldBills.${terminalId}`;

const readStored = (key: string): HeldBill[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as HeldBill[]) : [];
  } catch {
    return [];
  }
};

// Held bills are tablet-local scratch state (which table/customer is
// mid-order), not business data -- there's no server sync, just enough
// persistence that an accidental app restart doesn't lose a table that's
// still eating and hasn't paid yet.
export const useHeldBills = () => {
  const { terminalContext } = usePosContext();
  const key = storageKey(terminalContext.terminalId);
  const [heldBills, setHeldBills] = useState<HeldBill[]>(() => readStored(key));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(heldBills));
    } catch {
      // Storage full/unavailable -- held bills simply won't survive a restart.
    }
  }, [heldBills, key]);

  const holdBill = useCallback((label: string, cart: CartState, totalAmount: number) => {
    const bill: HeldBill = {
      cart,
      createdAt: new Date().toISOString(),
      id: globalThis.crypto.randomUUID(),
      label,
      totalAmount
    };
    setHeldBills((current) => [...current, bill]);
  }, []);

  const removeBill = useCallback((id: string) => {
    setHeldBills((current) => current.filter((bill) => bill.id !== id));
  }, []);

  return { heldBills, holdBill, removeBill };
};

export type HeldBillsApi = ReturnType<typeof useHeldBills>;
