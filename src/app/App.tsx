import { useState } from 'react';
import { AppErrorBoundary } from '@/app/AppErrorBoundary';
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';
import { SplashOverlay } from '@/components/splash/SplashOverlay';
import '@/app/app.css';

export function App() {
  const [splashVisible, setSplashVisible] = useState(true);

  return (
    <AppProviders>
      <AppErrorBoundary>
        <AppRouter />
        {splashVisible ? <SplashOverlay onDismiss={() => setSplashVisible(false)} /> : null}
      </AppErrorBoundary>
    </AppProviders>
  );
}