import { useTerminalMode } from '../../state/use-terminal-mode.js';
import { LoadingScreen } from '../auth/LoadingScreen.js';
import { SelfServiceKioskShell } from '../kiosk/SelfServiceKioskShell.js';
import { KioskShell } from './KioskShell.js';
import { UpdateAvailableBanner } from './UpdateAvailableBanner.js';

// Routes a logged-in terminal to the Billing POS or Self-Service Kiosk shell
// based on that terminal's own saved mode.
export const AppShell = () => {
  const terminalMode = useTerminalMode();

  if (terminalMode.loading) {
    return <LoadingScreen message="Loading terminal settings…" />;
  }

  return (
    <div className="flex h-full w-full flex-col">
      <UpdateAvailableBanner />
      <div className="min-h-0 flex-1">
        {terminalMode.settings.mode === 'SELF_SERVICE_KIOSK' ? (
          <SelfServiceKioskShell
            onTerminalSettingsSaved={terminalMode.refresh}
            terminalSettings={terminalMode.settings}
          />
        ) : (
          <KioskShell onTerminalSettingsSaved={terminalMode.refresh} terminalSettings={terminalMode.settings} />
        )}
      </div>
    </div>
  );
};
