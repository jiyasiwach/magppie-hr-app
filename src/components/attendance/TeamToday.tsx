'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AsyncSection,
  Button,
  Card,
  DataTable,
  EmptyState,
  Muted,
  Small,
  StatusPill,
  Working,
  type Column,
} from '@/components/ui';
import { getTeamAttendanceForDate } from '@/data/attendance';
import { useAsync } from '@/hooks/useAsync';
import { MOCK_TODAY } from '@/lib/clock';
import { addDays, formatDate, formatDayName, formatHours, formatTime } from '@/lib/date';
import { attendanceStatusLabels, attendanceStatusTones } from '@/lib/labels';
import type { AttendanceDay, AttendanceStatus, Employee } from '@/lib/types';
import s from './attendance.module.css';

interface Row {
  employee: Employee;
  day: AttendanceDay | null;
}

/** Who on the team is in, out or away on a given day. */
export function TeamToday({ team }: { team: Employee[] }) {
  const [date, setDate] = useState(MOCK_TODAY);
  const ids = team.map((e) => e.id);
  const { state, reload } = useAsync(() => getTeamAttendanceForDate(ids, date), [ids.join(','), date]);

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Person',
      primary: true,
      render: (r) => (
        <div>
          <Link href={`/directory/${r.employee.id}`}>{r.employee.fullName}</Link>{' '}
          <Muted>
            <Small>{r.employee.designation}</Small>
          </Muted>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.day ? (
          <StatusPill
            label={attendanceStatusLabels[r.day.status]}
            tone={attendanceStatusTones[r.day.status]}
          />
        ) : (
          <StatusPill label="No record" tone="quiet" />
        ),
    },
    { key: 'in', header: 'First in', render: (r) => formatTime(r.day?.firstIn ?? null) },
    { key: 'out', header: 'Last out', render: (r) => formatTime(r.day?.lastOut ?? null) },
    {
      key: 'hours',
      header: 'Hours',
      render: (r) => (r.day ? formatHours(r.day.totalHours) : '—'),
    },
  ];

  return (
    <Card
      title={`Team on ${formatDayName(date)}, ${formatDate(date)}`}
      hint="Everyone in your reporting line, for one day."
      actions={
        <>
          <Button onClick={() => setDate(addDays(date, -1))}>Previous day</Button>
          <Button onClick={() => setDate(addDays(date, 1))} disabled={date >= MOCK_TODAY}>
            Next day
          </Button>
          {date !== MOCK_TODAY ? (
            <Button variant="quiet" onClick={() => setDate(MOCK_TODAY)}>
              Today
            </Button>
          ) : null}
        </>
      }
    >
      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={() => team.length === 0}
        empty={
          <EmptyState
            title="You have nobody reporting to you"
            body="A team view needs a team. Ask HR if this looks wrong."
          />
        }
        loadingRows={5}
      >
        {(days) => {
          const byEmployee = new Map(days.map((d) => [d.employeeId, d]));
          const rows: Row[] = team
            .map((employee) => ({ employee, day: byEmployee.get(employee.id) ?? null }))
            .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName));

          const counts = rows.reduce<Record<string, number>>((acc, r) => {
            const key = r.day ? r.day.status : 'no-record';
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          }, {});

          return (
            <>
              <div className={s.teamSummary}>
                {Object.entries(counts).map(([status, count]) => (
                  <StatusPill
                    key={status}
                    label={`${attendanceStatusLabels[status as AttendanceStatus] ?? 'No record'}: ${count}`}
                    tone={attendanceStatusTones[status as AttendanceStatus] ?? 'quiet'}
                  />
                ))}
              </div>

              <DataTable rows={rows} columns={columns} rowKey={(r) => r.employee.id} caption="Team attendance" />

              <Working summary="How is this counted?">
                <ul className={s.summaryList}>
                  <li>
                    <span>People in your reporting line</span>
                    <span>{team.length}</span>
                  </li>
                  {Object.entries(counts).map(([status, count]) => (
                    <li key={status}>
                      <span>{attendanceStatusLabels[status as AttendanceStatus] ?? 'No record'}</span>
                      <span>{count}</span>
                    </li>
                  ))}
                </ul>
                <p className={s.workingNote}>
                  &ldquo;No record&rdquo; means nothing was written for that person on this date — not
                  that they were absent. Someone who joined after this date will always show that way.
                </p>
              </Working>
            </>
          );
        }}
      </AsyncSection>
    </Card>
  );
}
