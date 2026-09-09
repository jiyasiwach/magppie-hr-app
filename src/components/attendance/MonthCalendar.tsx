'use client';

import type { AttendanceDay, AttendanceStatus } from '@/lib/types';
import { MOCK_TODAY } from '@/lib/clock';
import { datesBetween, dayOfWeek, endOfMonth, startOfMonth } from '@/lib/date';
import { attendanceStatusLabels, attendanceStatusMarks } from '@/lib/labels';
import { holidays } from '@/mocks';
import s from './attendance.module.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Status → the cell's colour class. Mark letters back the colour up, so the
 *  calendar is still readable without relying on colour alone. */
const statusClass: Record<AttendanceStatus, string> = {
  present: s.dayPresent,
  'half-day': s.dayHalf,
  absent: s.dayAbsent,
  leave: s.dayLeave,
  holiday: s.dayOff,
  'weekly-off': s.dayOff,
  'pending-regularisation': s.dayPending,
};

const legend: Array<[AttendanceStatus | 'none', string, string]> = [
  ['present', 'P', 'Present'],
  ['half-day', '½', 'Half day'],
  ['leave', 'L', 'Leave'],
  ['absent', 'A', 'Absent'],
  ['holiday', 'H', 'Holiday'],
  ['weekly-off', 'W', 'Weekly off'],
  ['pending-regularisation', '?', 'Pending regularisation'],
  ['none', '', 'No record'],
];

export function MonthCalendar({
  month,
  days,
  selected,
  onSelect,
}: {
  month: string;
  days: AttendanceDay[];
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const first = startOfMonth(`${month}-01`);
  const last = endOfMonth(`${month}-01`);
  const dates = datesBetween(first, last);
  const byDate = new Map(days.map((d) => [d.date, d]));
  const holidayByDate = new Map(holidays.map((h) => [h.date, h.name]));
  const leadingBlanks = dayOfWeek(first);

  return (
    <div>
      <div className={s.weekdays} aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w} className={s.weekday}>
            {w}
          </span>
        ))}
      </div>

      <div className={s.grid} role="grid" aria-label={`Attendance for ${month}`}>
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <span key={`blank-${i}`} className={`${s.day} ${s.dayEmpty}`} />
        ))}

        {dates.map((date) => {
          const day = byDate.get(date);
          const classes = [s.day];
          if (day) classes.push(statusClass[day.status]);
          else classes.push(s.dayNoRecord);
          if (date === MOCK_TODAY) classes.push(s.dayToday);
          if (date === selected) classes.push(s.daySelected);

          const label = day
            ? attendanceStatusLabels[day.status]
            : date > MOCK_TODAY
              ? 'In the future — no record'
              : 'No record';

          return (
            <button
              key={date}
              type="button"
              className={classes.join(' ')}
              onClick={() => onSelect(date)}
              aria-label={`${date}: ${label}${holidayByDate.get(date) ? ` (${holidayByDate.get(date)})` : ''}`}
              aria-pressed={date === selected}
            >
              <span className={s.dayNumber}>{Number(date.slice(8, 10))}</span>
              <span className={s.dayMark}>{day ? attendanceStatusMarks[day.status] : ''}</span>
            </button>
          );
        })}
      </div>

      <div className={s.legend}>
        {legend.map(([status, mark, label]) => (
          <span key={label} className={s.legendItem}>
            <span
              className={`${s.legendMark} ${status === 'none' ? s.dayNoRecord : statusClass[status]}`}
            >
              {mark}
            </span>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
