import { memo } from 'react';
import { Bell, Globe, Menu, Moon, Sun } from 'lucide-react';
import { HeaderClock } from '@/components/layout/HeaderClock';
import { HeaderLogo } from '@/components/layout/HeaderLogo';
import { useLanguage } from '@/hooks';
import { toggleTheme } from '@/lib/theme';
import '@/components/layout/header.css';

const ICON_STROKE = 1.75;
const ICON_SIZE = 18;

type HeaderProps = {
  isMenuExpanded?: boolean;
  onToggleSidebar: () => void;
};

export const Header = memo(function Header({
  isMenuExpanded = false,
  onToggleSidebar,
}: HeaderProps) {
  const { t, toggleLanguage } = useLanguage();

  return (
    <header className="luxury-header">
      <div aria-hidden="true" className="luxury-header__marble" />

      <div className="luxury-header__inner">
        <button
          aria-expanded={isMenuExpanded}
          aria-label={t('common.menu')}
          className="luxury-header__control luxury-header__menu"
          onClick={onToggleSidebar}
          type="button"
        >
          <Menu aria-hidden="true" size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </button>

        <HeaderClock />

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
          <Globe
            aria-hidden="true"
            size={ICON_SIZE}
            strokeWidth={ICON_STROKE}
          />
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
});
