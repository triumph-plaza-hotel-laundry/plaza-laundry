import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useLanguage } from '@/hooks';
import '@/components/pwa/install-prompt.css';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function InstallPrompt() {
  const { language } = useLanguage();
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => window.localStorage.getItem('tpl-install-dismissed') === 'true',
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstallEvent(null);
      setDismissed(true);
      window.localStorage.setItem('tpl-install-dismissed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (!installEvent || dismissed) {
    return null;
  }

  const isArabic = language === 'ar';

  const handleInstall = async () => {
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallEvent(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    window.localStorage.setItem('tpl-install-dismissed', 'true');
  };

  return (
    <aside className="install-prompt" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="install-prompt__copy">
        <strong>
          {isArabic ? 'ثبّت تطبيق المغسلة' : 'Install Laundry App'}
        </strong>
        <span>
          {isArabic
            ? 'استخدم التطبيق بسرعة من الشاشة الرئيسية مع دعم العمل دون اتصال.'
            : 'Launch faster from your home screen with offline support.'}
        </span>
      </div>
      <div className="install-prompt__actions">
        <button
          className="install-prompt__button"
          onClick={handleInstall}
          type="button"
        >
          <Download aria-hidden="true" size={16} />
          {isArabic ? 'تثبيت' : 'Install'}
        </button>
        <button
          aria-label={isArabic ? 'إغلاق' : 'Dismiss'}
          className="install-prompt__dismiss"
          onClick={handleDismiss}
          type="button"
        >
          <X aria-hidden="true" size={16} />
        </button>
      </div>
    </aside>
  );
}
