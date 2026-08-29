import { Socket } from 'node:net';

import type { ReceiptPrinterProfile } from './printer-profile.js';
import { createTransportPrinterService } from './transport-printer-service.js';

export type TcpPrinterServiceOptions = {
  connectTimeoutMs?: number;
  now?: () => Date;
};

const defaultTimeoutMs = 5000;

const resolveTcpEndpoint = (profile: ReceiptPrinterProfile) => {
  const target = profile.target?.trim();

  if (!target) {
    throw new Error('TCP printer profile requires a target host');
  }

  if (!profile.port || !Number.isInteger(profile.port) || profile.port < 1 || profile.port > 65535) {
    throw new Error('TCP printer profile requires a valid port');
  }

  return { port: profile.port, target };
};

const writeTcpBytes = (
  profile: ReceiptPrinterProfile,
  bytes: Uint8Array,
  connectTimeoutMs: number
) =>
  new Promise<void>((resolve, reject) => {
    const { port, target } = resolveTcpEndpoint(profile);
    const socket = new Socket();
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) {
        return;
      }

      settled = true;

      if (!socket.destroyed) {
        socket.destroy();
      }

      if (error) {
        reject(error);
        return;
      }

      resolve();
    };

    socket.setTimeout(connectTimeoutMs);
    socket.once('timeout', () =>
      finish(new Error(`TCP printer connection timed out after ${connectTimeoutMs}ms`))
    );
    socket.once('error', (error) => finish(new Error(`TCP printer write failed: ${error.message}`)));
    socket.once('close', (hadError) => {
      if (!hadError) {
        finish();
      }
    });
    socket.connect(port, target, () => {
      socket.end(Buffer.from(bytes));
    });
  });

export const createTcpPrinterService = (options: TcpPrinterServiceOptions = {}) =>
  createTransportPrinterService({
    connectionType: 'TCP',
    execute: ({ bytes, profile }) =>
      writeTcpBytes(profile, bytes, options.connectTimeoutMs ?? defaultTimeoutMs),
    now: options.now
  });
