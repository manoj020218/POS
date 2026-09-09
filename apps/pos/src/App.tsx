import { AppShell } from './components/layout/AppShell.js';
import { PosProvider } from './state/pos-provider.js';

export const App = () => (
  <div className="h-screen w-screen overflow-hidden">
    <PosProvider>
      <AppShell />
    </PosProvider>
  </div>
);
