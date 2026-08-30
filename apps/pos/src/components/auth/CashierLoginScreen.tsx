import { useState, type FormEvent } from 'react';
import { Store } from 'lucide-react';

import { Button } from '../common/Button.js';

type CashierLoginScreenProps = {
  error: string | null;
  onSubmit: (email: string, password: string) => void;
  submitting: boolean;
};

export const CashierLoginScreen = ({ error, onSubmit, submitting }: CashierLoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(email.trim(), password);
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-surface p-6">
      <form
        className="flex w-full max-w-sm flex-col items-center gap-6 rounded-3xl bg-surface-raised p-8 shadow-kiosk-lg"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-white">
            <Store size={28} />
          </div>
          <p className="text-xl font-bold text-ink">Smart POS</p>
          <p className="text-sm text-ink-faint">Sign in to start your shift</p>
        </div>

        <div className="w-full space-y-3">
          <input
            autoComplete="username"
            className="h-14 w-full rounded-2xl border border-line bg-surface px-4 text-base font-medium text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            value={email}
          />
          <input
            autoComplete="current-password"
            className="h-14 w-full rounded-2xl border border-line bg-surface px-4 text-base font-medium text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            value={password}
          />
        </div>

        {error && (
          <p className="w-full rounded-xl bg-danger-50 px-4 py-3 text-center text-sm font-semibold text-danger-600">
            {error}
          </p>
        )}

        <Button
          disabled={submitting || email.length === 0 || password.length === 0}
          fullWidth
          size="lg"
          type="submit"
          variant="brand"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
};
