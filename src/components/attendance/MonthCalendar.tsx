'use client';

import type { AttendanceDay } from '@/lib/types';
import { MOCK_TODAY } from '@/lib/clock';
import { datesBetween, dayOfWeek, endOfMonth, startOfMonth } from '@/lib/date';
import { attendanceStatusLabels, attendanceStatusMarks } from '@/lib/labels';
import { holidays } from '@/mocks';
import s from './attendance.module.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const legend: Array<[string, string]> = [
  ['P', 'Present'],
  ['½', 'Half day'],
  ['L', 'Leave'],
  ['A', 'Absent'],
  ['H', 'Holiday'],
  ['W', 'Weekly off'],
  ['?', 'Pending regularisation'],
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
          if (date === MOCK_TODAY) classes.push(s.dayToday);
          if (date === selected) classes.push(s.daySelected);
          if (day?.status === 'weekly-off' || day?.status === 'holiday') classes.push(s.dayOff);
          if (day?.status === 'absent') classes.push(s.dayAbsent);
          if (day?.status === 'pending-regularisation') classes.push(s.dayPending);
          if (!day) classes.push(s.dayNoRecord);

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
        {legend.map(([mark, label]) => (
          <span key={mark} className={s.legendItem}>
            <span className={s.legendMark}>{mark}</span>
            {label}
          </span>
        ))}
        <span className={s.legendItem}>
          <span className={s.legendMark} style={{ borderStyle: 'dotted' }} />
          No record
        </span>
      </div>
    </div>
  );
}
