'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AsyncSection,
  Card,
  EmptyState,
  PageHeader,
  Person,
  Stack,
  StatusPill,
} from '@/components/ui';
import { IconChevronRight } from '@/components/ui/icons';
import { TeamToday } from '@/components/attendance/TeamToday';
import { TeamCalendar } from '@/components/leave/TeamCalendar';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { listTeam } from '@/data/directory';
import {
  applyTeamFilter,
  countsFor,
  currentWeek,
  getAwayThisWeek,
  getDepartments,
  getTeammates,
  type TeamFilter,
} from '@/data/team';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, formatTime } from '@/lib/date';
import { canSeeTeamCalendar, directReports, visibleEmployeeIds } from '@/lib/permissions';
import s from './team.module.css';

const CHIPS: Array<{ value: TeamFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'not-in', label: 'Not in yet' },
  { value: 'on-time', label: 'On time' },
  { value: 'remote', label: 'Remote' },
];

const VIEW_ALL_AFTER = 8;

export default function TeamPage() {
  const { user } = useCurrentUser();
  const isManager = canSeeTeamCalendar(user);

  return (
    <>
      <PageHeader
        title="My Team"
        description={
          isManager
            ? 'Your departments, who is off, and where your team is today.'
            : 'Your department and the people in it.'
        }
      />
      <Stack>
        <Departments />
        <OffThisWeek />
        <Teammates />
        {isManager ? <ManagerViews /> : null}
      </Stack>
    </>
  );
}

function Departments() {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getDepartments(user), [user.employee.id]);

  return (
    <Card title="My departments and units" flush>
      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(rows) => rows.length === 0}
        empty={<EmptyState title="No department" body="You are not assigned to a department yet." />}
        loadingRows={2}
      >
        {(rows) => (
          <ul className={s.deptList}>
            {rows.map((d) => (
              <li key={d.department}>
                <Link href={`/directory?department=${encodeURIComponent(d.department)}`} className={s.deptRow}>
                  <span className={s.deptText}>
                    <span className={s.deptName}>
                      {d.department}
                      {d.own ? <StatusPill label="Yours" tone="quiet" /> : null}
                    </span>
                    <span className={s.deptMeta}>
                      {d.headcount} {d.headcount === 1 ? 'person' : 'people'}
                      {d.recentJoiners > 0
                        ? ` · ${d.recentJoiners} joined in the last 90 days`
                        : ' · no recent joiners'}
                    </span>
                  </span>
                  <IconChevronRight size={18} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AsyncSection>
    </Card>
  );
}

function OffThisWeek() {
  const { user } = useCurrentUser();
  const week = currentWeek();
  const { state, reload } = useAsync(
    () => getAwayThisWeek(visibleEmployeeIds(user)),
    [user.employee.id],
  );

  return (
    <Card
      title="Off this week"
      hint={`${formatDate(week.start)} – ${formatDate(week.end)}`}
      actions={
        <Link href="/leave" className={s.link}>
          Upcoming leaves
        </Link>
      }
    >
      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            title="Nobody on your team is off this week"
            body="Approved and pending leave overlapping this week shows here."
          />
        }
        loadingRows={2}
      >
        {(rows) => (
          <ul className={s.awayList}>
            {rows.map((a, i) => (
              <li key={`${a.employee.id}-${i}`} className={s.awayRow}>
                <Person
                  name={a.employee.fullName}
                  href={`/directory/${a.employee.id}`}
                  secondary={`${a.leaveTypeName} · ${a.dates.map((d) => formatDate(d)).join(', ')}`}
                />
                <StatusPill
                  label={a.pending ? 'Pending' : 'Approved'}
                  tone={a.pending ? 'warning' : 'success'}
                />
              </li>
            ))}
          </ul>
        )}
      </AsyncSection>
    </Card>
  );
}

function Teammates() {
  const { user } = useCurrentUser();
  const [filter, setFilter] = useState<TeamFilter>('all');
  const [expanded, setExpanded] = useState(false);
  const { state, reload } = useAsync(() => getTeammates(user), [user.employee.id]);

  const managerId = user.employee.managerId;
  const reports = directReports(user.employee.id);

  return (
    <Card title="My teammates" flush>
      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(rows) => rows.length === 0}
        empty={<EmptyState title="No teammates" body="People in your reporting line appear here." />}
        loadingRows={4}
      >
        {(rows) => {
          const counts = countsFor(rows);
          const filtered = applyTeamFilter(rows, filter);
          const manager = filtered.filter((r) => r.employee.id === managerId);
          const myReports = filtered.filter((r) => reports.includes(r.employee.id));
          const peers = filtered.filter(
            (r) => r.employee.id !== managerId && !reports.includes(r.employee.id),
          );

          const groups = [
            { title: 'Manager', rows: manager },
            { title: 'My reports', rows: myReports },
            { title: 'Peers', rows: peers },
          ].filter((g) => g.rows.length > 0);

          return (
            <>
              <div className={s.chips} role="group" aria-label="Filter teammates">
                {CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    className={`${s.chip} ${filter === chip.value ? s.chipActive : ''}`}
                    aria-pressed={filter === chip.value}
                    onClick={() => setFilter(chip.value)}
                  >
                    {chip.label}
                    <span className={s.chipCount}>{counts[chip.value]}</span>
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <EmptyState
                  title="Nobody in this state right now"
                  body="Try another filter — the counts above show where everyone is."
                />
              ) : (
                groups.map((group) => {
                  const visible = expanded ? group.rows : group.rows.slice(0, VIEW_ALL_AFTER);
                  return (
                    <section key={group.title} className={s.group}>
                      <h3 className={s.groupTitle}>{group.title}</h3>
                      <ul className={s.mateList}>
                        {visible.map((r) => (
                          <li key={r.employee.id} className={s.mateRow}>
                            <Person
                              name={r.employee.fullName}
                              href={`/directory/${r.employee.id}`}
                              secondary={r.employee.designation}
                            />
                            <StateChip state={r.state} firstIn={r.firstIn} shiftStart={r.shift.startTime} />
                          </li>
                        ))}
                      </ul>
                      {group.rows.length > VIEW_ALL_AFTER ? (
                        <button type="button" className={s.viewAll} onClick={() => setExpanded((v) => !v)}>
                          {expanded ? 'Show fewer' : `View all ${group.rows.length}`}
                        </button>
                      ) : null}
                    </section>
                  );
                })
              )}

              <p className={s.footnote}>
                &ldquo;On time&rdquo; compares the first punch against the shift start. Shift timings are
                placeholders and shift assignment is derived from location — there is no roster yet.
              </p>
            </>
          );
        }}
      </AsyncSection>
    </Card>
  );
}

function StateChip({
  state,
  firstIn,
  shiftStart,
}: {
  state: string;
  firstIn: string | null;
  shiftStart: string;
}) {
  if (state === 'away') return <StatusPill label="On leave" tone="info" />;
  if (state === 'remote') return <StatusPill label="Remote" tone="info" />;
  if (state === 'not-in') return <StatusPill label={`Not in yet · shift ${shiftStart}`} tone="warning" />;
  if (state === 'late')
    return <StatusPill label={`Late · in ${formatTime(firstIn)}`} tone="danger" />;
  return <StatusPill label={`On time · in ${formatTime(firstIn)}`} tone="success" />;
}

function ManagerViews() {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => listTeam(user), [user.employee.id]);

  return (
    <AsyncSection state={state} reload={reload} loadingRows={4}>
      {(team) => (
        <Stack>
          <TeamToday team={team} />
          <TeamCalendar team={team} />
        </Stack>
      )}
    </AsyncSection>
  );
}
