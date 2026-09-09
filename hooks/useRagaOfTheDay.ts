'use client';

import { useEffect, useState } from 'react';
import {
  getLocalCalendarDateKey,
  getRagaOfTheDayForDate,
  msUntilNextLocalMidnight,
} from '@/lib/music/ragaOfTheDay';

export function useRagaOfTheDay() {
  const [date, setDate] = useState(getLocalCalendarDateKey);
  useEffect(() => {
    const refresh = () => setDate(getLocalCalendarDateKey());
    const timer = window.setTimeout(refresh, msUntilNextLocalMidnight());
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [date]);
  return getRagaOfTheDayForDate(date);
}
