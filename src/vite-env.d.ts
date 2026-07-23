/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ONESIGNAL_APP_ID: string;
  readonly VITE_ONESIGNAL_SAFARI_WEB_ID?: string;
  /** Set to "false" to disable self-healing notification platform client. */
  readonly VITE_NOTIFICATION_PLATFORM_V2?: string;
  readonly VITE_APP_BUILD_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
