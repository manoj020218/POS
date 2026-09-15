import { Download, X } from 'lucide-react';
import { useState } from 'react';

import { useAppUpdateStatus } from '../../state/use-app-update-status.js';

// Shown above whichever shell (billing or self-service kiosk) is active, so
// it's visible regardless of terminal mode. Dismissible for the current app
// session only -- it comes back the next time the app is opened as long as
// the installed build is still behind, rather than being permanently
// silenced by one tap.
export const UpdateAvailableBanner = () => {
  const status = useAppUpdateStatus();
  const [dismissed, setDismissed] = useState(false);

  if (!status.updateAvailable || dismissed) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 bg-brand-500 px-4 py-2 text-white">
      <div className="flex min-w-0 items-center gap-2">
        <Download size={18} className="shrink-0" />
        <p className="truncate text-sm font-semibold">
          A new version of Smart POS is available on the Play Store.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-bold active:bg-white/30"
          onClick={() => {
            window.location.href = status.playStoreUrl;
          }}
          type="button"
        >
          Update now
        </button>
        <button aria-label="Dismiss" className="rounded-lg p-1.5 active:bg-white/20" onClick={() => setDismissed(true)} type="button">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
