import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from '@/app/App';
import '@/styles/index.css';

const updateSW = registerSW({
  immediate: true,
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
