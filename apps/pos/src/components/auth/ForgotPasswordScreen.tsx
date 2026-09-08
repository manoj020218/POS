import { useState, type FormEvent } from 'react';
import { ArrowLeft, KeyRound } from 'lucide-react';

import { apiBaseUrl } from '../../lib/api-config.js';
import { Button } from '../common/Button.js';

type ForgotPasswordScreenProps = {
  onBack: () => void;
  onReset: (email: string, newPassword: string) => void;
};

const inputClassName =
  'h-14 w-full rounded-2xl border border-line bg-surface px-4 text-base font-medium text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500';

export const ForgotPasswordScreen = ({ onBack, onReset }: ForgotPasswordScreenProps) => {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await fetch(`${apiBaseUrl}/auth/password/reset/request`, {
        body: JSON.stringify({ email: email.trim() }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
      });
      // Always advance: the API never discloses whether the email exists.
      setStep('confirm');
    } catch {
      setError('Could not reach the server. Check your internet connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (event: FormEvent) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/password/reset/confirm`, {
        body: JSON.stringify({ newPassword, resetToken: resetToken.trim() }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? 'That code is invalid or has expired. Request a new one.');
        return;
      }

      onReset(email.trim(), newPassword);
    } catch {
      setError('Could not reach the server. Check your internet connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-surface p-6">
      <form
        className="mx-auto flex w-full max-w-sm flex-col gap-6 py-4"
        onSubmit={step === 'request' ? handleRequest : handleConfirm}
      >
        <button
          className="flex items-center gap-2 self-start text-sm font-semibold text-ink-muted"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </button>

        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-white">
            <KeyRound size={28} />
          </div>
          <p className="text-xl font-bold text-ink">Reset your password</p>
          <p className="text-center text-sm text-ink-faint">
            {step === 'request'
              ? "Enter your account email and we'll send you a reset code."
              : 'Enter the code we emailed you and choose a new password.'}
          </p>
        </div>

        {step === 'request' ? (
          <input
            autoComplete="email"
            className={inputClassName}
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            value={email}
          />
        ) : (
          <div className="w-full space-y-3">
            <input
              className={inputClassName}
              onChange={(event) => setResetToken(event.target.value)}
              placeholder="Reset code from email"
              value={resetToken}
            />
            <input
              autoComplete="new-password"
              className={inputClassName}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
              type="password"
              value={newPassword}
            />
            <input
              autoComplete="new-password"
              className={inputClassName}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              type="password"
              value={confirmPassword}
            />
          </div>
        )}

        {error && (
          <p className="w-full rounded-xl bg-danger-50 px-4 py-3 text-center text-sm font-semibold text-danger-600">
            {error}
          </p>
        )}

        <Button
          disabled={
            submitting ||
            (step === 'request'
              ? email.trim().length === 0
              : resetToken.trim().length === 0 || newPassword.length === 0 || confirmPassword.length === 0)
          }
          fullWidth
          size="lg"
          type="submit"
          variant="brand"
        >
          {submitting ? 'Please wait…' : step === 'request' ? 'Send reset code' : 'Reset password'}
        </Button>
      </form>
    </div>
  );
};
