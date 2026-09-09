import { useTerminalMode } from '../../state/use-terminal-mode.js';
import { LoadingScreen } from '../auth/LoadingScreen.js';
import { SelfServiceKioskShell } from '../kiosk/SelfServiceKioskShell.js';
import { KioskShell } from './KioskShell.js';

// Routes a logged-in terminal to the Billing POS or Self-Service Kiosk shell
// based on that terminal's own saved mode.
export const AppShell = () => {
  const terminalMode = useTerminalMode();

  if (terminalMode.loading) {
    return <LoadingScreen message="Loading terminal settings…" />;
  }

  if (terminalMode.settings.mode === 'SELF_SERVICE_KIOSK') {
    return (
      <SelfServiceKioskShell onTerminalSettingsSaved={terminalMode.refresh} terminalSettings={terminalMode.settings} />
    );
  }

  return <KioskShell onTerminalSettingsSaved={terminalMode.refresh} terminalSettings={terminalMode.settings} />;
};
