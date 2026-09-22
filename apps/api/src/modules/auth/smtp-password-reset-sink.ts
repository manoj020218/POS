import type { Transporter } from 'nodemailer';

import type { PasswordResetTokenSink } from './password-reset.service.js';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });

const buildHtmlBody = (token: string, expiresLabel: string) => `
<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background-color:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr>
              <td style="padding:32px 32px 8px 32px;text-align:center;">
                <div style="display:inline-flex;width:48px;height:48px;border-radius:12px;background-color:#4f46e5;line-height:48px;font-size:24px;">&#128274;</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px;text-align:center;">
                <h1 style="margin:0;font-size:20px;color:#111827;">Reset your Smart POS password</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 0 32px;text-align:center;">
                <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">
                  Open the Smart POS app, tap "Forgot password", and enter this code along with your new password.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px;text-align:center;">
                <div style="display:inline-block;padding:16px 24px;border-radius:12px;background-color:#f4f4f7;font-size:32px;font-weight:700;letter-spacing:8px;color:#4f46e5;font-family:'SFMono-Regular',Consolas,monospace;">
                  ${escapeHtml(token)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;text-align:center;">
                <p style="margin:0;font-size:13px;color:#9ca3af;">This code expires in about ${escapeHtml(expiresLabel)}.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">If you didn't request this, you can safely ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export const createSmtpPasswordResetTokenSink = (
  transporter: Pick<Transporter, 'sendMail'>,
  fromAddress: string
): PasswordResetTokenSink => {
  return async ({ email, expiresAt, token }) => {
    const expiresInMinutes = Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 60000));
    const expiresLabel = `${expiresInMinutes} minute${expiresInMinutes === 1 ? '' : 's'}`;

    await transporter.sendMail({
      from: fromAddress,
      html: buildHtmlBody(token, expiresLabel),
      subject: 'Reset your Smart POS password',
      text: [
        'Your Smart POS password reset code is:',
        '',
        token,
        '',
        `Open the Smart POS app, tap "Forgot password", and enter this code along with your new password.`,
        `This code expires in about ${expiresLabel}.`,
        '',
        "If you didn't request this, you can ignore this email."
      ].join('\n'),
      to: email
    });
  };
};
