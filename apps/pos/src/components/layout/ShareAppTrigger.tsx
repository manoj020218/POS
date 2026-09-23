import { Share } from '@capacitor/share';
import { useEffect } from 'react';

type ShareAppTriggerProps = {
  onClose: () => void;
  open: boolean;
};

const playStoreUrl = 'https://play.google.com/store/apps/details?id=in.iotsoft.smartpos';

// Not a modal -- this "menu entry" fits the existing renderModal(open, onClose)
// shape from useTopBarMenuEntries just to fire the native share sheet the
// moment it's selected, then immediately reset the menu's active entry.
export const ShareAppTrigger = ({ onClose, open }: ShareAppTriggerProps) => {
  useEffect(() => {
    if (!open) {
      return;
    }

    void Share.share({
      dialogTitle: 'Share Smart POS',
      text: 'I run my shop billing on Smart POS & KIOSK -- worth a look:',
      title: 'Smart POS & KIOSK',
      url: playStoreUrl
    })
      .catch(() => undefined)
      .finally(onClose);
  }, [onClose, open]);

  return null;
};
