import { memo } from 'react';
import { useCairoTime, useLanguage } from '@/hooks';

export const HeaderClock = memo(function HeaderClock() {
  const { language } = useLanguage();
  const cairoTime = useCairoTime(language);

  return (
    <time
      className="luxury-header__control luxury-header__time"
      dateTime={cairoTime}
      suppressHydrationWarning
      title="Africa/Cairo"
    >
      {cairoTime}
    </time>
  );
});
