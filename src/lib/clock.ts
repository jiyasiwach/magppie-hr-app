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
