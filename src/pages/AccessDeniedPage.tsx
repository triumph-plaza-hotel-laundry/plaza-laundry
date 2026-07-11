import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useLanguage } from '@/hooks';

export function AccessDeniedPage() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--app-bg)] px-6 text-center text-[var(--app-text)]">
      <ShieldX
        aria-hidden="true"
        className="text-[var(--app-gold)]"
        size={48}
        strokeWidth={1.5}
      />
      <h1 className="text-xl font-medium">{t('auth.accessDeniedTitle')}</h1>
      <p className="max-w-md text-sm text-[var(--app-muted)]">
        {t('auth.accessDeniedMessage')}
      </p>
      <Link
        className="rounded-full border border-[var(--app-border)] px-5 py-2 text-sm text-[var(--app-gold)] transition hover:border-[var(--app-gold)]"
        to="/"
      >
        {t('auth.backToDashboard')}
      </Link>
    </div>
  );
}
