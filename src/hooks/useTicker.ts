'use client';

import { useEffect, useState } from 'react';

/**
 * The current time, refreshed on an interval, so an elapsed-time display
 * actually runs. Returns the value rather than a counter so nothing has to call
 * `Date.now()` during render.
 */
export function useNow(intervalMs = 1000): number {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return nowMs;
}

/** "2h 14m 09s" from a millisecond span. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
}
