import { LogOut, Store, User } from 'lucide-react';

import { usePosContext } from '../../state/use-pos-context.js';
import { CalculatorButton } from '../calculator/CalculatorButton.js';
import { IconButton } from '../common/IconButton.js';
import { PrinterSettingsButton } from '../settings/PrinterSettingsButton.js';
import { ProductImportExportButton } from '../settings/ProductImportExportButton.js';
import { LiveClock } from './LiveClock.js';

export const TopBar = () => {
  const { logout, settings, terminalContext } = usePosContext();

  return (
    <header className="flex h-20 shrink-0 items-center justify-between gap-3 overflow-x-auto border-b border-line bg-surface-raised px-3 lg:px-6">
      <div className="flex min-w-0 shrink-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white">
          <Store size={22} />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-base font-bold text-ink">{settings.businessName}</p>
          <p className="truncate text-xs font-medium text-ink-faint">
            {terminalContext.branchName} · {terminalContext.terminalName ?? terminalContext.terminalCode}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 lg:gap-5">
        <CalculatorButton />
        <PrinterSettingsButton />
        <ProductImportExportButton />
        <div className="flex items-center gap-2 rounded-2xl bg-surface-sunken px-4 py-2">
          <User size={18} className="text-ink-muted" />
          <span className="text-sm font-semibold text-ink">{terminalContext.cashierName}</span>
        </div>
        <div className="hidden lg:block">
          <LiveClock />
        </div>
        <IconButton label="Sign out" onClick={logout} tone="danger">
          <LogOut size={20} />
        </IconButton>
      </div>
    </header>
  );
};
