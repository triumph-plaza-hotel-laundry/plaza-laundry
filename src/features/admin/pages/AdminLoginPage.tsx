import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import logoUrl from '@/assets/images/logo.webp';
import { canAccessAdminPortal } from '@/features/auth/permissions';
import { resetForgottenAdminPassword } from '@/features/auth/users';
import { useAuth, useLanguage } from '@/hooks';
import '@/components/splash/splash.css';
import '@/features/admin/admin-login-page.css';

type AdminLoginLocationState = {
  from?: string;
};

export function AdminLoginPage() {
  const { isAuthenticated, isReady, login, logout, role } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as AdminLoginLocationState | null)?.from ?? '/admin';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isReady && isAuthenticated && role && canAccessAdminPortal(role)) {
      navigate(from, { replace: true });
    }
  }, [from, isAuthenticated, isReady, navigate, role]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isForgotPassword) {
        if (password !== confirmPassword) {
          setError(t('admin.settings.passwordMismatch'));
          return;
        }

        await resetForgottenAdminPassword(username, password);
      }

      const user = await login({ email: username, password });

      if (!canAccessAdminPortal(user.role)) {
        logout();
        setError(t('auth.adminAccessDenied'));
        return;
      }

      navigate(from, { replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : t('auth.invalidCredentials'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isReady && isAuthenticated && role && canAccessAdminPortal(role)) {
    return <Navigate replace to={from} />;
  }

  return (
    <div
      aria-label={t('admin.login.title')}
      className="admin-login-page"
      role="main"
    >
      <div aria-hidden="true" className="admin-login-page__atmosphere" />
      <div className="admin-login-page__content">
        <img
          alt=""
          className="admin-login-page__logo"
          decoding="async"
          draggable={false}
          src={logoUrl}
        />
        <p className="admin-login-page__eyebrow">{t('admin.login.eyebrow')}</p>
        <h1 className="admin-login-page__title">{t('login.hotelName')}</h1>
        <p className="admin-login-page__subtitle">
          {t('admin.login.subtitle')}
        </p>

        <form className="admin-login-page__form" onSubmit={handleSubmit}>
          <h2 className="admin-login-page__form-title">
            {isForgotPassword
              ? t('admin.login.forgotTitle')
              : t('admin.login.title')}
          </h2>
          <p className="admin-login-page__form-hint">
            {isForgotPassword
              ? t('admin.login.forgotHint')
              : t('admin.login.hint')}
          </p>

          <label className="admin-login-page__label">
            {t('login.emailLabel')}
            <input
              autoComplete="username"
              className="admin-login-page__input"
              onChange={(event) => setUsername(event.target.value)}
              placeholder={t('login.emailPlaceholder')}
              required
              value={username}
            />
          </label>

          <label className="admin-login-page__label">
            {t('login.passwordLabel')}
            <input
              autoComplete="current-password"
              className="admin-login-page__input"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                isForgotPassword
                  ? t('admin.login.newPasswordPlaceholder')
                  : t('login.passwordPlaceholder')
              }
              required
              type="password"
              value={password}
            />
          </label>

          {isForgotPassword ? (
            <label className="admin-login-page__label">
              {t('admin.settings.confirmPassword')}
              <input
                autoComplete="new-password"
                className="admin-login-page__input"
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t('admin.settings.confirmPassword')}
                required
                type="password"
                value={confirmPassword}
              />
            </label>
          ) : null}

          {error ? <p className="admin-login-page__error">{error}</p> : null}

          <button
            className="admin-login-page__submit"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? t('login.submitting')
              : isForgotPassword
                ? t('admin.login.resetAndSignIn')
                : t('admin.login.submit')}
          </button>
          <button
            className="admin-login-page__link"
            onClick={() => {
              setIsForgotPassword((current) => !current);
              setError(null);
              setPassword('');
              setConfirmPassword('');
            }}
            type="button"
          >
            {isForgotPassword
              ? t('admin.login.backToSignIn')
              : t('admin.login.forgotPassword')}
          </button>
        </form>
      </div>
    </div>
  );
}
