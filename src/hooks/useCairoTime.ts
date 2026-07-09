import { useEffect, useState } from 'react';
import type { Language } from '@/types/language';

const CAIRO_TIMEZONE = 'Africa/Cairo';

function formatCairoTime(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
    timeZone: CAIRO_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function useCairoTime(language: Language): string {
  const [time, setTime] = useState(() => formatCairoTime(new Date(), language));

  useEffect(() => {
    const tick = () => {
      setTime((previous) => {
        const next = formatCairoTime(new Date(), language);
        return next === previous ? previous : next;
      });
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [language]);

  return time;
}
