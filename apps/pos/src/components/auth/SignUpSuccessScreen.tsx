import { CheckCircle2 } from 'lucide-react';

import { Button } from '../common/Button.js';

type SignUpSuccessScreenProps = {
  businessCode: string;
  email: string;
  onContinue: () => void;
  tempPassword: string;
};

export const SignUpSuccessScreen = ({ businessCode, email, onContinue, tempPassword }: SignUpSuccessScreenProps) => (
  <div className="flex h-full w-full items-center justify-center bg-surface p-6">
    <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl bg-surface-raised p-8 shadow-kiosk-lg">
      <div className="flex flex-col items-center gap-2 text-center">
        <CheckCircle2 className="text-success-500" size={40} />
        <p className="text-xl font-bold text-ink">Your shop is ready</p>
        <p className="text-sm text-ink-faint">Write these down — you'll need the password to sign in.</p>
      </div>

      <div className="w-full space-y-3 rounded-2xl bg-surface-sunken p-4 text-sm">
        <div>
          <p className="text-ink-faint">Business code</p>
          <p className="font-mono text-base font-semibold text-ink">{businessCode}</p>
        </div>
        <div>
          <p className="text-ink-faint">Email</p>
          <p className="font-mono text-base font-semibold text-ink">{email}</p>
        </div>
        <div>
          <p className="text-ink-faint">Temporary password</p>
          <p className="font-mono text-base font-semibold text-ink">{tempPassword}</p>
        </div>
      </div>

      <Button fullWidth onClick={onContinue} size="lg" variant="brand">
        Continue to sign in
      </Button>
    </div>
  </div>
);
