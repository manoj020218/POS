import nodemailer, { type Transporter } from 'nodemailer';

export type SmtpConfig = {
  host: string;
  pass: string;
  port: number;
  secure: boolean;
  user: string;
};

export const createSmtpTransport = (config: SmtpConfig): Transporter =>
  nodemailer.createTransport({
    auth: { pass: config.pass, user: config.user },
    host: config.host,
    port: config.port,
    secure: config.secure
  });
