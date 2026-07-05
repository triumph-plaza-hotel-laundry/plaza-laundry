import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks';

export function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <main
      className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-6 text-center text-[var(--app-text)]"
      role="main"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--app-gold)]">404</p>
      <h1 className="m-0 text-3xl font-semibold">{t('page.notFoundTitle')}</h1>
      <p className="max-w-md text-sm leading-6 text-[var(--app-muted)]">{t('page.notFoundMessage')}</p>
      <Link
        className="rounded-full border border-[var(--app-gold-border)] px-5 py-2 text-sm font-semibold text-[var(--app-gold)] transition hover:border-[var(--app-gold)] focus-visible:luxury-focus"
        to="/"
      >
        {t('page.notFoundAction')}
      </Link>
    </main>
  );
}
