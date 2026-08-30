import type { ClientTerminalContext } from '@smart-pos/client-data';

export const demoIds = {
  branchId: 'demo-branch-main',
  businessId: 'demo-business-01',
  cashierUserId: 'demo-cashier-01',
  terminalId: 'demo-terminal-01'
} as const;

export const demoTerminalContext: ClientTerminalContext = {
  branchCode: 'MAIN',
  branchId: demoIds.branchId,
  branchName: 'Main Branch',
  businessId: demoIds.businessId,
  businessName: 'Smart POS Demo Store',
  cashierName: 'Asha Rao',
  cashierUserId: demoIds.cashierUserId,
  deviceId: 'demo-device-01',
  terminalCode: 'T1',
  terminalId: demoIds.terminalId,
  terminalName: 'Counter 1'
};
