export const paymentMethods = ['CASH', 'CARD', 'UPI', 'OTHER'] as const;

export type PaymentMethod = (typeof paymentMethods)[number];

export type ClientTerminalContext = {
  branchCode: string;
  branchId: string;
  branchName: string;
  businessId: string;
  businessName: string;
  cashierName?: string;
  cashierUserId: string;
  deviceId: string;
  terminalCode: string;
  terminalId: string;
  terminalName?: string;
};
