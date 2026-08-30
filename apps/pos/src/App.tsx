import { KioskShell } from './components/layout/KioskShell.js';
import { PosProvider } from './state/pos-provider.js';

export const App = () => (
  <div className="h-screen w-screen overflow-hidden">
    <PosProvider>
      <KioskShell />
    </PosProvider>
  </div>
);
