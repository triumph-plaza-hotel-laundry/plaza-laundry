const appId =
  import.meta.env.VITE_ONESIGNAL_APP_ID ??
  (typeof process !== 'undefined'
    ? process.env.VITE_ONESIGNAL_APP_ID
    : undefined);

const safariWebId =
  import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID ??
  (typeof process !== 'undefined'
    ? process.env.VITE_ONESIGNAL_SAFARI_WEB_ID
    : undefined);

export const onesignalConfig = {
  appId: (appId ?? '').trim(),
  safariWebId: (safariWebId ?? '').trim(),
  isConfigured: Boolean((appId ?? '').trim()),
} as const;
