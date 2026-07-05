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

function msUntilNextMinute(): number {
  const now = new Date();
  return (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
}

export function useCairoTime(language: Language): string {
  const [time, setTime] = useState(() => formatCairoTime(new Date(), language));

  useEffect(() => {
    setTime(formatCairoTime(new Date(), language));

    let intervalId = 0;
    const timeoutId = window.setTimeout(() => {
      setTime(formatCairoTime(new Date(), language));
      intervalId = window.setInterval(() => {
        setTime(formatCairoTime(new Date(), language));
      }, 60_000);
    }, msUntilNextMinute());

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [language]);

  return time;
}
