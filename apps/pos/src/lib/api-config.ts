export const apiBaseUrl: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000/api/v1';

export const billingSignupApiUrl: string =
  (import.meta.env.VITE_BILLING_SIGNUP_URL as string | undefined) ?? 'https://iotsoft.in/api/smartpos/signup';

export const deviceName = 'Smart POS Kiosk';
