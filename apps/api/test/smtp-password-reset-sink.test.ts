import { describe, expect, it, vi } from 'vitest';

import { createSmtpPasswordResetTokenSink } from '../src/modules/auth/smtp-password-reset-sink.js';

describe('smtp password reset sink', () => {
  it('emails the reset token to the user', async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const sink = createSmtpPasswordResetTokenSink({ sendMail }, 'Smart POS <no-reply@iotsoft.in>');

    await sink({
      email: 'owner@example.com',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      tenantId: '11111111-1111-4111-8111-111111111111',
      token: 'super-secret-reset-token',
      userId: '22222222-2222-4222-8222-222222222222'
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0]?.[0];
    expect(message.to).toBe('owner@example.com');
    expect(message.from).toBe('Smart POS <no-reply@iotsoft.in>');
    expect(message.subject).toMatch(/reset/i);
    expect(message.text).toContain('super-secret-reset-token');
  });
});
