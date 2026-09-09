'use client';

import { useState } from 'react';
import { AsyncSection, Button, Card, EmptyState, Muted, Small } from '@/components/ui';
import { getTeamLeave } from '@/data/leave';
import { useAsync } from '@/hooks/useAsync';
import { MOCK_TODAY } from '@/lib/clock';
import { addMonths, datesBetween, dayOfWeek, endOfMonth, formatDate, formatMonth, startOfMonth } from '@/lib/date';
import { holidays, leaveTypes, weeklyOffDays } from '@/mocks';
import type { Employee } from '@/lib/types';
import s from './leave.module.css';

/** Who is on leave when, so a clash is visible before anything is approved. */
export function TeamCalendar({ team }: { team: Employee[] }) {
  const [month, setMonth] = useState(MOCK_TODAY.slice(0, 7));
  const first = startOfMonth(`${month}-01`);
  const last = endOfMonth(`${month}-01`);
  const dates = datesBetween(first, last);
  const ids = team.map((e) => e.id);

  const { state, reload } = useAsync(() => getTeamLeave(ids, first, last), [ids.join(','), first, last]);
  const holidayDates = new Set(holidays.map((h) => h.date));

  return (
    <Card
      title={`Team calendar — ${formatMonth(month)}`}
      hint="Approved leave is filled in; pending leave is outlined."
      actions={
        <>
          <Button onClick={() => setMonth(addMonths(month, -1))}>Previous</Button>
          <Button onClick={() => setMonth(addMonths(month, 1))}>Next</Button>
        </>
      }
    >
      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={() => team.length === 0}
        empty={<EmptyState title="You have nobody reporting to you" body="A team calendar needs a team." />}
      >
        {(entries) => {
          const byPersonDate = new Map(entries.map((e) => [`${e.employeeId}|${e.date}`, e]));
          const perDate = new Map<string, string[]>();
          entries.forEach((e) => {
            perDate.set(e.date, [...(perDate.get(e.date) ?? []), e.employeeId]);
          });
          const clashes = dates
            .map((d) => ({ date: d, ids: perDate.get(d) ?? [] }))
            .filter((d) => d.ids.length > 1);

          return (
            <>
              <div className={s.calendarScroll}>
                <table className={s.teamGrid}>
                  <caption className="visually-hidden">Team leave for {formatMonth(month)}</caption>
                  <thead>
                    <tr>
                      <th className={s.teamName} scope="col">
                        Person
                      </th>
                      {dates.map((d) => (
                        <th
                          key={d}
                          scope="col"
                          className={`${s.dayHead} ${weeklyOffDays.includes(dayOfWeek(d)) || holidayDates.has(d) ? s.dayHeadOff : ''}`}
                        >
                          {Number(d.slice(8, 10))}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((person) => (
                      <tr key={person.id}>
                        <th className={s.teamName} scope="row">
                          {person.fullName}
                        </th>
                        {dates.map((d) => {
                          const entry = byPersonDate.get(`${person.id}|${d}`);
                          const off = weeklyOffDays.includes(dayOfWeek(d)) || holidayDates.has(d);
                          const classes = [s.cell];
                          if (off) classes.push(s.cellOff);
                          if (entry?.status === 'approved') classes.push(s.cellApproved);
                          if (entry?.status === 'pending') classes.push(s.cellPending);
                          const type = entry ? leaveTypes.find((t) => t.id === entry.leaveTypeId)?.name : null;
                          return (
                            <td
                              key={d}
                              className={classes.join(' ')}
                              title={entry ? `${person.fullName} — ${type} (${entry.status})` : undefined}
                            >
                              {entry ? (entry.half ? '½' : '•') : ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {clashes.length > 0 ? (
                <ul className={s.clashList}>
                  <li>
                    <Muted>
                      <Small>Days when more than one person is off:</Small>
                    </Muted>
                  </li>
                  {clashes.map((c) => (
                    <li key={c.date} className={s.clashItem}>
                      <strong>{formatDate(c.date)}</strong> —{' '}
                      {c.ids
                        .map((id) => team.find((t) => t.id === id)?.fullName ?? id)
                        .join(', ')}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ marginTop: 16 }}>
                  <Muted>
                    <Small>No day this month has more than one person off.</Small>
                  </Muted>
                </p>
              )}
            </>
          );
        }}
      </AsyncSection>
    </Card>
  );
}
