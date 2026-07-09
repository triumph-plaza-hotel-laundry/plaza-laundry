import { useState, type FormEvent } from 'react';
import logoUrl from '@/assets/images/logo.png';
import { useLanguage } from '@/hooks';
import '@/features/inventory/inventory-login.css';

type InventoryLoginPageProps = {
  onLogin: (username: string, password: string) => boolean;
};

export function InventoryLoginPage({ onLogin }: InventoryLoginPageProps) {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const success = onLogin(username, password);
    if (!success) {
      setError(t('inventory.login.invalidCredentials'));
    }

    setIsSubmitting(false);
  };

  return (
    <div aria-label={t('inventory.login.title')} className="inventory-login-page" role="main">
      <div aria-hidden="true" className="inventory-login-page__atmosphere" />
      <div className="inventory-login-page__content">
        <img
          alt=""
          className="inventory-login-page__logo"
          decoding="async"
          draggable={false}
          src={logoUrl}
        />
        <p className="inventory-login-page__eyebrow">{t('inventory.login.eyebrow')}</p>
        <h1 className="inventory-login-page__title">{t('login.hotelName')}</h1>
        <p className="inventory-login-page__subtitle">{t('inventory.login.subtitle')}</p>

        <form className="inventory-login-page__form" onSubmit={handleSubmit}>
          <h2 className="inventory-login-page__form-title">{t('inventory.login.title')}</h2>
          <p className="inventory-login-page__form-hint">{t('inventory.login.hint')}</p>

          <label className="inventory-login-page__label">
            {t('inventory.login.usernameLabel')}
            <input
              autoComplete="username"
              className="inventory-login-page__input"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder={t('inventory.login.usernamePlaceholder')}
              required
              type="text"
              value={username}
            />
          </label>

          <label className="inventory-login-page__label">
            {t('login.passwordLabel')}
            <input
              autoComplete="current-password"
              className="inventory-login-page__input"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              required
              type="password"
              value={password}
            />
          </label>

          {error ? <p className="inventory-login-page__error">{error}</p> : null}

          <button className="inventory-login-page__submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? t('inventory.login.submitting') : t('inventory.login.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
