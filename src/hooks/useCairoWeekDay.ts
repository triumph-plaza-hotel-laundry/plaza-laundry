import { useMemo } from 'react';
import { getCairoWeekDay, type WeekDayId } from '@/data/laundry-shifts';
import { useCairoToday } from '@/hooks/useCairoToday';

export function useCairoWeekDay(): WeekDayId {
  const today = useCairoToday();

  return useMemo(() => {
    const anchor = new Date(
      Date.UTC(today.year, today.month - 1, today.day, 12, 0, 0),
    );
    return getCairoWeekDay(anchor);
  }, [today.day, today.month, today.year]);
}
