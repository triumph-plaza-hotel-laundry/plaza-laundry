import { Bell, Globe, Menu, Moon, Sun } from 'lucide-react';
import { HeaderLogo } from '@/components/layout/HeaderLogo';
import { useCairoTime, useLanguage } from '@/hooks';
import { toggleTheme } from '@/lib/theme';
import '@/components/layout/header.css';

const ICON_STROKE = 1.75;
const ICON_SIZE = 18;

type HeaderProps = {
  onOpenSidebar: () => void;
};

export function Header({ onOpenSidebar }: HeaderProps) {
  const { language, t, toggleLanguage } = useLanguage();
  const cairoTime = useCairoTime(language);

  return (
    <header className="luxury-header">
      <div aria-hidden="true" className="luxury-header__marble" />

      <div className="luxury-header__inner">
        <button
          aria-label={t('common.menu')}
          className="luxury-header__control"
          onClick={onOpenSidebar}
          type="button"
        >
          <Menu aria-hidden="true" size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </button>

        <time
          className="luxury-header__control luxury-header__time"
          dateTime={cairoTime}
          suppressHydrationWarning
          title="Africa/Cairo"
        >
          {cairoTime}
        </time>

        <button
          aria-label={t('common.theme')}
          className="luxury-header__control luxury-header__theme-toggle"
          onClick={toggleTheme}
          type="button"
        >
          <Sun
            aria-hidden="true"
            className="luxury-header__theme-icon luxury-header__theme-icon--sun"
            size={ICON_SIZE}
            strokeWidth={ICON_STROKE}
          />
          <Moon
            aria-hidden="true"
            className="luxury-header__theme-icon luxury-header__theme-icon--moon"
            size={ICON_SIZE}
            strokeWidth={ICON_STROKE}
          />
        </button>

        <button
          aria-label={t('common.language')}
          className="luxury-header__control"
          onClick={toggleLanguage}
          type="button"
        >
          <Globe aria-hidden="true" size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </button>

        <button
          aria-label={t('common.notifications')}
          className="luxury-header__control luxury-header__notification"
          type="button"
        >
          <Bell aria-hidden="true" size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </button>

        <HeaderLogo />
      </div>
    </header>
  );
}
