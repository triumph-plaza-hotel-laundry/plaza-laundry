import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from '@/app/App';
import { bootstrapOneSignalWebPush } from '@/lib/onesignal';
import '@/styles/index.css';

let oneSignalBootstrapStarted = false;

function bootstrapPushOnce() {
  if (oneSignalBootstrapStarted) {
    return;
  }

  oneSignalBootstrapStarted = true;

  // Wait for splash / first paint so the OneSignal slidedown is visible.
  window.setTimeout(() => {
    void bootstrapOneSignalWebPush().catch(() => undefined);
  }, 2500);
}

const updateSW = registerSW({
  immediate: true,
  onRegistered() {
    bootstrapPushOnce();
  },
  onRegisterError() {
    bootstrapPushOnce();
  },
  onNeedRefresh() {
    const shouldReload = window.confirm(
      'A new version is available. Reload now?',
    );
    if (shouldReload) {
      void updateSW(true);
    }
  },
  onOfflineReady() {
    if (import.meta.env.DEV) {
      console.info('[pwa] Offline cache is ready');
    }
  },
});

// Dev often skips PWA registration — still bootstrap OneSignal.
window.setTimeout(() => bootstrapPushOnce(), 3000);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
