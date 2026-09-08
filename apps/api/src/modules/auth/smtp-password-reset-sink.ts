import type { Transporter } from 'nodemailer';

import type { PasswordResetTokenSink } from './password-reset.service.js';

export const createSmtpPasswordResetTokenSink = (
  transporter: Pick<Transporter, 'sendMail'>,
  fromAddress: string
): PasswordResetTokenSink => {
  return async ({ email, expiresAt, token }) => {
    const expiresInMinutes = Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 60000));

    await transporter.sendMail({
      from: fromAddress,
      subject: 'Reset your Smart POS password',
      text: [
        'Your Smart POS password reset code is:',
        '',
        token,
        '',
        `Open the Smart POS app, tap "Forgot password", and enter this code along with your new password.`,
        `This code expires in about ${expiresInMinutes} minute${expiresInMinutes === 1 ? '' : 's'}.`,
        '',
        "If you didn't request this, you can ignore this email."
      ].join('\n'),
      to: email
    });
  };
};
