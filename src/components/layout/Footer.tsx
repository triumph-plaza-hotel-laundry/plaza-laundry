import { logoUrl } from '@/assets/images';
import { useLanguage } from '@/hooks';
import type { TranslationKey } from '@/types/language';
import '@/components/layout/footer.css';

type SocialIconProps = {
  name: 'instagram' | 'facebook' | 'linkedin' | 'email';
};

function SocialIcon({ name }: SocialIconProps) {
  switch (name) {
    case 'instagram':
      return (
        <svg aria-hidden="true" className="luxury-footer__social-icon" viewBox="0 0 24 24">
          <rect height="18" rx="5" ry="5" width="18" x="3" y="3" />
          <circle cx="12" cy="12" r="4.25" />
          <circle cx="17.35" cy="6.65" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'facebook':
      return (
        <svg aria-hidden="true" className="luxury-footer__social-icon" viewBox="0 0 24 24">
          <path d="M14 8.5h2.5V5H14c-2.4 0-4 1.45-4 4.2V12H7v3.5h3v8.5h3.5V15.5H17L18 12h-4.5V9.1c0-.85.65-1.6 1.5-1.6Z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg aria-hidden="true" className="luxury-footer__social-icon" viewBox="0 0 24 24">
          <rect height="16" rx="2" width="16" x="4" y="4" />
          <path d="M8 10.5v7.5M8 7.5v.01" />
          <path d="M12 18v-4.2c0-1.65 1.35-3 3-3s3 1.35 3 3V18" />
          <path d="M12 10.5V18" />
        </svg>
      );
    case 'email':
      return (
        <svg aria-hidden="true" className="luxury-footer__social-icon" viewBox="0 0 24 24">
          <rect height="14" rx="2" width="18" x="3" y="5" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
  }
}

const socialLinks: ReadonlyArray<{
  key: TranslationKey;
  href: string;
  icon: SocialIconProps['name'];
}> = [
  { key: 'footer.social.instagram', href: 'https://instagram.com', icon: 'instagram' },
  { key: 'footer.social.facebook', href: 'https://facebook.com', icon: 'facebook' },
  { key: 'footer.social.linkedin', href: 'https://linkedin.com', icon: 'linkedin' },
  { key: 'footer.social.email', href: 'mailto:info@triumphplaza.com', icon: 'email' },
];

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="luxury-footer">
      <div aria-hidden="true" className="luxury-footer__marble" />
      <div aria-hidden="true" className="luxury-footer__overlay" />
      <div aria-hidden="true" className="luxury-footer__ambient" />
      <div aria-hidden="true" className="luxury-footer__divider" />

      <div className="luxury-footer__inner">
        <img
          alt={t('app.name')}
          className="luxury-footer__logo"
          decoding="async"
          draggable={false}
          src={logoUrl}
        />

        <p className="luxury-footer__tagline">{t('footer.tagline')}</p>

        <p className="luxury-footer__copyright">{t('footer.copyright')}</p>

        <nav aria-label={t('footer.social.label')} className="luxury-footer__social">
          {socialLinks.map(({ key, href, icon }) => (
            <a
              key={key}
              aria-label={t(key)}
              className="luxury-footer__social-link"
              href={href}
              rel="noopener noreferrer"
              target="_blank"
            >
              <SocialIcon name={icon} />
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
