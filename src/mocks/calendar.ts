import type { Holiday, Shift } from '@/lib/types';

/** 13.12 Holidays. Mock calendar — HR maintains the real one. */
export const holidays: Holiday[] = [
  { id: 'hol-01', date: '2026-01-26', name: 'Republic Day', optional: false },
  { id: 'hol-02', date: '2026-03-04', name: 'Holi', optional: false },
  { id: 'hol-03', date: '2026-04-14', name: 'Ambedkar Jayanti', optional: true },
  { id: 'hol-04', date: '2026-08-15', name: 'Independence Day', optional: false },
  { id: 'hol-05', date: '2026-08-26', name: 'Ganesh Chaturthi', optional: true },
  { id: 'hol-06', date: '2026-09-04', name: 'Onam', optional: true },
  { id: 'hol-07', date: '2026-10-02', name: 'Gandhi Jayanti', optional: false },
  { id: 'hol-08', date: '2026-10-20', name: 'Dussehra', optional: false },
  { id: 'hol-09', date: '2026-11-08', name: 'Diwali', optional: false },
  { id: 'hol-10', date: '2026-11-09', name: 'Govardhan Puja', optional: true },
  { id: 'hol-11', date: '2026-12-25', name: 'Christmas', optional: false },
];

/**
 * 13.3 Shifts.
 *
 * FLAGGED: real shift timings per location have never been given. These are
 * placeholders, and every screen that uses them says so.
 */
export const shifts: Shift[] = [
  { id: 'sh-general', name: 'General', startTime: '09:30', endTime: '18:30', expectedHours: 9, flexible: true },
  { id: 'sh-factory-a', name: 'Factory A', startTime: '08:00', endTime: '17:00', expectedHours: 9, flexible: false },
  { id: 'sh-factory-b', name: 'Factory B', startTime: '14:00', endTime: '23:00', expectedHours: 9, flexible: false },
  { id: 'sh-showroom', name: 'Showroom', startTime: '10:30', endTime: '19:30', expectedHours: 9, flexible: false },
  { id: 'sh-site', name: 'Site', startTime: '08:30', endTime: '17:30', expectedHours: 9, flexible: true },
];

/**
 * Which shift a person is on. There is no shift-assignment shape in section 13,
 * so this is derived from where they work. FLAGGED: rostering is a real module
 * and this is a stand-in for it.
 */
export function shiftIdForLocation(location: string, department: string): string {
  if (department === 'Production') return location.includes('Noida') ? 'sh-factory-a' : 'sh-factory-b';
  if (department === 'Installation') return 'sh-site';
  if (location.includes('Showroom')) return 'sh-showroom';
  return 'sh-general';
}

/** Saturday and Sunday. FLAGGED: the factory almost certainly differs. */
export const weeklyOffDays = [0, 6];
