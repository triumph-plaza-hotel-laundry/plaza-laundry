import { useEffect, useState } from 'react';
import {
  PRIMARY_ADMIN_DEVICE_ALREADY_CONFIGURED,
  canRegisterPrimaryAdminDevice,
  getPrimaryAdminDevice,
  registerPrimaryAdminDevice,
} from '@/features/primary-admin-device';
import { getErrorMessage } from '@/lib/supabase/errors';
import { useAuth, useLanguage } from '@/hooks';
import '@/features/primary-admin-device/primary-admin-device.css';

type PanelState = 'loading' | 'empty' | 'configured' | 'hidden';

export function PrimaryAdminDevicePanel() {
  const { t } = useLanguage();
  const { user, logAction } = useAuth();
  const [panelState, setPanelState] = useState<PanelState>('loading');
  const [confirming, setConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const eligible = canRegisterPrimaryAdminDevice(user);

  useEffect(() => {
    if (!eligible) {
      setPanelState('hidden');
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const existing = await getPrimaryAdminDevice();
        if (cancelled) {
          return;
        }
        setPanelState(existing ? 'configured' : 'empty');
        setError(null);
      } catch (caught) {
        if (cancelled) {
          return;
        }
        setPanelState('empty');
        setError(
          getErrorMessage(caught, t('admin.primaryDevice.loadFailed')),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eligible, t]);

  if (!eligible || panelState === 'hidden' || panelState === 'loading') {
    return null;
  }

  const handleRegister = async () => {
    if (!user || !confirming || isSaving) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const device = await registerPrimaryAdminDevice(user);
      setPanelState('configured');
      setConfirming(false);
      setMessage(t('admin.primaryDevice.registered'));
      logAction({
        action: 'primary_admin_device.register',
        page: 'admin',
        newValue: {
          deviceId: device.deviceId,
          onesignalSubscriptionId: device.onesignalSubscriptionId,
        },
      });
    } catch (caught) {
      const text = getErrorMessage(
        caught,
        t('admin.primaryDevice.registerFailed'),
      );
      setError(text);
      if (text === PRIMARY_ADMIN_DEVICE_ALREADY_CONFIGURED) {
        setPanelState('configured');
        setConfirming(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <aside
      aria-label={t('admin.primaryDevice.title')}
      className="primary-admin-device"
    >
      <p className="primary-admin-device__title">{t('admin.primaryDevice.title')}</p>

      {panelState === 'configured' ? (
        <p className="primary-admin-device__note" role="status">
          {t('admin.primaryDevice.alreadyConfigured')}
        </p>
      ) : (
        <>
          <p className="primary-admin-device__copy">
            {t('admin.primaryDevice.copy')}
          </p>

          {!confirming ? (
            <button
              className="primary-admin-device__button"
              disabled={isSaving}
              onClick={() => setConfirming(true)}
              type="button"
            >
              {t('admin.primaryDevice.registerButton')}
            </button>
          ) : (
            <div className="primary-admin-device__confirm">
              <p className="primary-admin-device__confirm-text">
                {t('admin.primaryDevice.confirmPrompt')}
              </p>
              <div className="primary-admin-device__actions">
                <button
                  className="primary-admin-device__button primary-admin-device__button--primary"
                  disabled={isSaving}
                  onClick={() => void handleRegister()}
                  type="button"
                >
                  {isSaving
                    ? t('admin.primaryDevice.registering')
                    : t('admin.primaryDevice.confirmButton')}
                </button>
                <button
                  className="primary-admin-device__button primary-admin-device__button--ghost"
                  disabled={isSaving}
                  onClick={() => setConfirming(false)}
                  type="button"
                >
                  {t('admin.editor.cancel')}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error ? (
        <p className="primary-admin-device__message primary-admin-device__message--error">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="primary-admin-device__message primary-admin-device__message--success"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </aside>
  );
}
