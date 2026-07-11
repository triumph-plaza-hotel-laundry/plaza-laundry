import { useEffect, useState } from 'react';
import {
  getCairoDateKey,
  getCairoDateParts,
  msUntilNextCairoMidnight,
  msUntilNextMinute,
  type CairoDateParts,
} from '@/lib/birthday-utils';

export function useCairoToday(): CairoDateParts {
  const [today, setToday] = useState(() => getCairoDateParts());

  useEffect(() => {
    setToday(getCairoDateParts());

    let intervalId = 0;
    let midnightTimeoutId = 0;

    const scheduleMidnightRefresh = () => {
      midnightTimeoutId = window.setTimeout(() => {
        setToday(getCairoDateParts());
        scheduleMidnightRefresh();
      }, msUntilNextCairoMidnight());
    };

    const minuteTimeoutId = window.setTimeout(() => {
      setToday((previous) => {
        const next = getCairoDateParts();
        return getCairoDateKey(previous) === getCairoDateKey(next)
          ? previous
          : next;
      });
      intervalId = window.setInterval(() => {
        setToday((previous) => {
          const next = getCairoDateParts();
          return getCairoDateKey(previous) === getCairoDateKey(next)
            ? previous
            : next;
        });
      }, 60_000);
    }, msUntilNextMinute());

    scheduleMidnightRefresh();

    return () => {
      window.clearTimeout(minuteTimeoutId);
      window.clearTimeout(midnightTimeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  return today;
}
