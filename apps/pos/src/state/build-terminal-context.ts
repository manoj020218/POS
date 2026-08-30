import type {
  ClientAuthUser,
  ClientBusinessSettings,
  ClientRemoteTerminalSummary,
  ClientTerminalContext
} from '@smart-pos/client-data';

import { getOrCreateDeviceId } from '../lib/device-id.js';

export const buildTerminalContext = (input: {
  settings: ClientBusinessSettings;
  terminal: ClientRemoteTerminalSummary;
  user: ClientAuthUser;
}): ClientTerminalContext => {
  const branch = input.settings.branches.find((entry) => entry.branchId === input.terminal.branchId);

  return {
    branchCode: branch?.branchCode ?? 'MAIN',
    branchId: input.terminal.branchId,
    branchName: branch?.branchName ?? 'Branch',
    businessId: input.settings.businessId,
    businessName: input.settings.businessName,
    cashierName: input.user.displayName,
    cashierUserId: input.user.id,
    deviceId: getOrCreateDeviceId(),
    terminalCode: input.terminal.code,
    terminalId: input.terminal.id,
    terminalName: input.terminal.name
  };
};
