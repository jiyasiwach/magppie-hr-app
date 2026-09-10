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
 * The instant to measure "now" against.
 *
 * While the real date matches MOCK_TODAY the live clock is used, so the Home
 * timer actually ticks. Once the real date moves past the pinned day it freezes
 * at the mock instant instead — otherwise a punch pinned to 9 September is
 * measured against a later real date and the card reports absurdities like
 * "28h 40m of 9h".
 */
export function effectiveNow(liveMs: number): Date {
  return mockDayIsToday() ? new Date(liveMs) : now();
}
