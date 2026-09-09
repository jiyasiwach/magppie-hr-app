import type { Holiday } from '@/lib/types';

/** Mock holiday calendar. In production this comes from an HR-maintained list. */
export const holidays: Holiday[] = [
  { date: '2026-01-26', name: 'Republic Day' },
  { date: '2026-03-04', name: 'Holi' },
  { date: '2026-04-14', name: 'Ambedkar Jayanti' },
  { date: '2026-08-15', name: 'Independence Day' },
  { date: '2026-08-26', name: 'Ganesh Chaturthi' },
  { date: '2026-09-04', name: 'Onam' },
  { date: '2026-10-02', name: 'Gandhi Jayanti' },
  { date: '2026-10-20', name: 'Dussehra' },
  { date: '2026-11-08', name: 'Diwali' },
  { date: '2026-12-25', name: 'Christmas' },
];

/** Saturday and Sunday. Factory runs a 6-day week — flagged as an open question. */
export const weeklyOffDays = [0, 6];
