import { CreditCard, HelpCircle, LayoutGrid, PackagePlus, Percent, Receipt, Sheet, Sparkles, Ticket } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ClientTerminalSettings } from '@smart-pos/client-data';

import { AddEditProductModal } from '../catalog/AddEditProductModal.js';
import { KioskOrderQueueModal } from '../kiosk/KioskOrderQueueModal.js';
import { AiAssistantModal } from '../settings/AiAssistantModal.js';
import { GstSettingsModal } from '../settings/GstSettingsModal.js';
import { HelpModal } from '../settings/HelpModal.js';
import { PaymentGatewaysModal } from '../settings/PaymentGatewaysModal.js';
import { ProductImportExportModal } from '../settings/ProductImportExportModal.js';
import { ReceiptMessageSettingsModal } from '../settings/ReceiptMessageSettingsModal.js';
import { TerminalModeSettingsModal } from '../settings/TerminalModeSettingsModal.js';

export type TopBarMenuEntry = {
  icon: ReactNode;
  id: string;
  label: string;
  renderModal: (open: boolean, onClose: () => void) => ReactNode;
};

type UseTopBarMenuEntriesInput = {
  onProductSaved: () => void;
  onTerminalSettingsSaved: () => void;
  terminalSettings: ClientTerminalSettings;
};

// One row here = one thing that used to be its own always-visible TopBar
// icon. Each is settings-shaped (configured occasionally, not tapped every
// sale), so by default only a couple stay pinned to the bar -- the rest
// live behind the 3-dot menu until the cashier chooses to pin them.
export const useTopBarMenuEntries = ({
  onProductSaved,
  onTerminalSettingsSaved,
  terminalSettings
}: UseTopBarMenuEntriesInput): TopBarMenuEntry[] => [
  {
    icon: <PackagePlus size={20} />,
    id: 'add-product',
    label: 'Add product',
    renderModal: (open, onClose) =>
      open && (
        <AddEditProductModal
          onClose={onClose}
          onSaved={() => {
            onClose();
            onProductSaved();
          }}
        />
      )
  },
  {
    icon: <Ticket size={20} />,
    id: 'kiosk-orders',
    label: 'Kiosk orders',
    renderModal: (open, onClose) => <KioskOrderQueueModal onClose={onClose} open={open} />
  },
  {
    icon: <Sheet size={20} />,
    id: 'import-export',
    label: 'Import / export products',
    renderModal: (open, onClose) => <ProductImportExportModal onClose={onClose} open={open} />
  },
  {
    icon: <Percent size={20} />,
    id: 'gst-settings',
    label: 'GST settings',
    renderModal: (open, onClose) => <GstSettingsModal onClose={onClose} open={open} />
  },
  {
    icon: <CreditCard size={20} />,
    id: 'payment-gateways',
    label: 'Payment gateways',
    renderModal: (open, onClose) => <PaymentGatewaysModal onClose={onClose} open={open} />
  },
  {
    icon: <Receipt size={20} />,
    id: 'receipt-message',
    label: 'Receipt message',
    renderModal: (open, onClose) => <ReceiptMessageSettingsModal onClose={onClose} open={open} />
  },
  {
    icon: <LayoutGrid size={20} />,
    id: 'terminal-mode',
    label: 'Terminal mode',
    renderModal: (open, onClose) => (
      <TerminalModeSettingsModal
        onClose={onClose}
        onSaved={() => {
          onClose();
          onTerminalSettingsSaved();
        }}
        open={open}
        terminalSettings={terminalSettings}
      />
    )
  },
  {
    icon: <HelpCircle size={20} />,
    id: 'help',
    label: 'Help & support',
    renderModal: (open, onClose) => <HelpModal onClose={onClose} open={open} />
  },
  {
    icon: <Sparkles size={20} />,
    id: 'ai-assistant',
    label: 'AI Assistant (coming soon)',
    renderModal: (open, onClose) => <AiAssistantModal onClose={onClose} open={open} />
  }
];
