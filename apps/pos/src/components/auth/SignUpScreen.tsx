import { useState, type FormEvent } from 'react';
import { ArrowLeft, Store } from 'lucide-react';

import { billingSignupApiUrl } from '../../lib/api-config.js';
import { Button } from '../common/Button.js';

type SignUpFormState = {
  address: string;
  agentCode: string;
  businessName: string;
  city: string;
  contactPersonName: string;
  email: string;
  mobile: string;
  pincode: string;
  state: string;
};

const emptyForm: SignUpFormState = {
  address: '',
  agentCode: '',
  businessName: '',
  city: '',
  contactPersonName: '',
  email: '',
  mobile: '',
  pincode: '',
  state: ''
};

type SignUpResult = {
  businessCode: string;
  email: string;
  tempPassword: string;
};

type SignUpScreenProps = {
  onBack: () => void;
  onSignedUp: (result: SignUpResult) => void;
};

const inputClassName =
  'h-14 w-full rounded-2xl border border-line bg-surface px-4 text-base font-medium text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500';

export const SignUpScreen = ({ onBack, onSignedUp }: SignUpScreenProps) => {
  const [form, setForm] = useState<SignUpFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof SignUpFormState) => (event: { target: { value: string } }) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(billingSignupApiUrl, {
        body: JSON.stringify(form),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
      });
      const body = (await response.json().catch(() => null)) as
        | { businessCode?: string; email?: string; error?: string; tempPassword?: string }
        | null;

      if (!response.ok || !body?.tempPassword || !body.email || !body.businessCode) {
        setError(body?.error ?? 'Could not create your account. Please try again.');
        return;
      }

      onSignedUp({ businessCode: body.businessCode, email: body.email, tempPassword: body.tempPassword });
    } catch {
      setError('Could not reach the signup service. Check your internet connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    form.businessName.trim().length > 0 &&
    form.contactPersonName.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.mobile.trim().length > 0 &&
    form.address.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.state.trim().length > 0 &&
    form.pincode.trim().length > 0;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-surface p-6">
      <form className="mx-auto flex w-full max-w-sm flex-col gap-6 py-4" onSubmit={handleSubmit}>
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
            <Store size={28} />
          </div>
          <p className="text-xl font-bold text-ink">Create your free account</p>
          <p className="text-center text-sm text-ink-faint">We'll set up your shop and hand you a temporary password.</p>
        </div>

        <div className="w-full space-y-3">
          <input
            className={inputClassName}
            onChange={update('businessName')}
            placeholder="Shop / business name"
            value={form.businessName}
          />
          <input
            className={inputClassName}
            onChange={update('contactPersonName')}
            placeholder="Owner name"
            value={form.contactPersonName}
          />
          <input
            autoComplete="email"
            className={inputClassName}
            inputMode="email"
            onChange={update('email')}
            placeholder="Email"
            type="email"
            value={form.email}
          />
          <input
            autoComplete="tel"
            className={inputClassName}
            inputMode="tel"
            onChange={update('mobile')}
            placeholder="Mobile number"
            type="tel"
            value={form.mobile}
          />
          <input className={inputClassName} onChange={update('address')} placeholder="Shop address" value={form.address} />
          <div className="flex gap-3">
            <input className={inputClassName} onChange={update('city')} placeholder="City" value={form.city} />
            <input className={inputClassName} onChange={update('state')} placeholder="State" value={form.state} />
          </div>
          <input
            className={inputClassName}
            inputMode="numeric"
            onChange={update('pincode')}
            placeholder="Pincode"
            value={form.pincode}
          />
          <input
            className={inputClassName}
            onChange={update('agentCode')}
            placeholder="Agent code (optional)"
            value={form.agentCode}
          />
        </div>

        {error && (
          <p className="w-full rounded-xl bg-danger-50 px-4 py-3 text-center text-sm font-semibold text-danger-600">
            {error}
          </p>
        )}

        <Button disabled={submitting || !canSubmit} fullWidth size="lg" type="submit" variant="brand">
          {submitting ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </div>
  );
};
