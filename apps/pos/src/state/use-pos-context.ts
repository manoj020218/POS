import { useContext } from 'react';

import { PosContext, type PosContextValue } from './pos-provider.js';

export const usePosContext = (): PosContextValue => {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error('usePosContext must be used within a PosProvider');
  }

  return context;
};
