/**
 * The app is pinned to a fixed "today" so the mock screens are deterministic
 * and reviewable. When the back end arrives this becomes `new Date()`.
 */
export const MOCK_TODAY = '2026-09-09';

export function today(): string {
  return MOCK_TODAY;
}

export function now(): Date {
  return new Date(`${MOCK_TODAY}T14:20:00+05:30`);
}

/** The real calendar date, in IST. */
export function realToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/** True only while the wall clock still agrees with the pinned mock day. */
export function mockDayIsToday(): boolean {
  return realToday() === MOCK_TODAY;
}

/**
 * The pinned mock day at the real time of day (IST). Live punches are stamped
 * with this, so a clock-in made on any real date lands on the mock "today" and
 * shows up on Home; the timer keeps ticking with the wall clock.
 */
export function liveMockNow(liveMs: number = Date.now()): Date {
  const time = new Date(liveMs).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
  return new Date(`${MOCK_TODAY}T${time}+05:30`);
}

/**
 * The instant to measure "now" against: the live clock while the real date is
 * the mock day, otherwise the mock day at the real time of day. (It used to
 * freeze at 14:20 once the mock day passed, which also hid every new punch,
 * because those carried the real date.)
 */
export function effectiveNow(liveMs: number): Date {
  return mockDayIsToday() ? new Date(liveMs) : liveMockNow(liveMs);
}
