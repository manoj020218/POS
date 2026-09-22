import { useState, type FormEvent } from 'react';
import { ArrowLeft, KeyRound } from 'lucide-react';

import { apiBaseUrl } from '../../lib/api-config.js';
import { Button } from '../common/Button.js';

type ForgotPasswordScreenProps = {
  onBack: () => void;
  onReset: (email: string, newPassword: string) => void;
};

type IdentifierType = 'email' | 'mobile';

const inputClassName =
  'h-14 w-full rounded-2xl border border-line bg-surface px-4 text-base font-medium text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500';

const toggleButtonClassName = (active: boolean) =>
  `h-11 flex-1 rounded-xl text-sm font-semibold transition-colors ${
    active ? 'bg-brand-500 text-white' : 'bg-surface-sunken text-ink-muted'
  }`;

export const ForgotPasswordScreen = ({ onBack, onReset }: ForgotPasswordScreenProps) => {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [identifierType, setIdentifierType] = useState<IdentifierType>('email');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
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
      const response = await fetch(`${apiBaseUrl}/auth/password/reset/request`, {
        body: JSON.stringify(
          identifierType === 'email' ? { email: email.trim() } : { mobile: mobile.trim() }
        ),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
      });
      const body = (await response.json().catch(() => null)) as { data?: { maskedEmail?: string } } | null;
      // Always advance: the API never discloses whether the account exists,
      // beyond this optional masked-email hint when a mobile lookup succeeds.
      setMaskedEmail(body?.data?.maskedEmail ?? null);
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

      // Only pre-fill sign-in with a real, typeable email -- maskedEmail
      // (e.g. "ow***@example.com") came from a mobile lookup and isn't one.
      onReset(identifierType === 'email' ? email.trim() : '', newPassword);
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
              ? "Enter your account email or mobile number and we'll send a reset code to your email."
              : maskedEmail
                ? `Enter the code we emailed to ${maskedEmail} and choose a new password.`
                : 'Enter the code we emailed you and choose a new password.'}
          </p>
        </div>

        {step === 'request' ? (
          <div className="flex w-full flex-col gap-3">
            <div className="flex gap-2 rounded-xl bg-surface-sunken p-1">
              <button
                className={toggleButtonClassName(identifierType === 'email')}
                onClick={() => setIdentifierType('email')}
                type="button"
              >
                Email
              </button>
              <button
                className={toggleButtonClassName(identifierType === 'mobile')}
                onClick={() => setIdentifierType('mobile')}
                type="button"
              >
                Mobile number
              </button>
            </div>
            {identifierType === 'email' ? (
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
              <input
                autoComplete="tel"
                className={inputClassName}
                inputMode="tel"
                onChange={(event) => setMobile(event.target.value)}
                placeholder="Mobile number"
                type="tel"
                value={mobile}
              />
            )}
          </div>
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
              ? identifierType === 'email'
                ? email.trim().length === 0
                : mobile.trim().length === 0
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
