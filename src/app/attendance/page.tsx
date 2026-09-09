'use client';

import { useState } from 'react';
import {
  AsyncSection,
  Button,
  Card,
  Grid,
  Metric,
  PageHeader,
  Stack,
  Working,
} from '@/components/ui';
import { DayDetail } from '@/components/attendance/DayDetail';
import { MonthCalendar } from '@/components/attendance/MonthCalendar';
import { PunchControl } from '@/components/attendance/PunchControl';
import { TeamToday } from '@/components/attendance/TeamToday';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { getAttendanceMonth, getMonthSummary } from '@/data/attendance';
import { listTeam } from '@/data/directory';
import { useAsync } from '@/hooks/useAsync';
import { MOCK_TODAY } from '@/lib/clock';
import { addMonths, formatDate, formatHours, formatMonth } from '@/lib/date';
import { attendanceStatusLabels } from '@/lib/labels';
import { canSeeTeamCalendar, canViewPersonalData, visibleEmployeeIds } from '@/lib/permissions';
import type { AttendanceStatus } from '@/lib/types';
import { employees } from '@/mocks';
import s from './attendance.module.css';

export default function AttendancePage() {
  const { user } = useCurrentUser();
  const [subjectId, setSubjectId] = useState(user.employee.id);
  const [month, setMonth] = useState(MOCK_TODAY.slice(0, 7));
  const [selected, setSelected] = useState<string | null>(MOCK_TODAY);

  const isSelf = subjectId === user.employee.id;
  const allowed = canViewPersonalData(user, subjectId);

  const showTeam = canSeeTeamCalendar(user);
  const teamQuery = useAsync(() => listTeam(user), [user.employee.id]);
  const monthQuery = useAsync(() => getAttendanceMonth(subjectId, month), [subjectId, month]);
  const summaryQuery = useAsync(() => getMonthSummary(subjectId, month), [subjectId, month]);

  const selectable = employees
    .filter((e) => visibleEmployeeIds(user).includes(e.id))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <>
      <PageHeader
        title={isSelf ? 'My attendance' : 'Attendance'}
        description="Punch in and out, and check the month. Tap any day to see the raw punches behind it."
      />

      <Stack>
        {isSelf ? <PunchControl employeeId={user.employee.id} /> : null}

        {showTeam ? (
          <AsyncSection state={teamQuery.state} reload={teamQuery.reload} loadingRows={4}>
            {(team) => <TeamToday team={team} />}
          </AsyncSection>
        ) : null}

        {selectable.length > 1 ? (
          <Card>
            <label className={s.label} htmlFor="att-subject">
              Whose attendance
            </label>
            <select
              id="att-subject"
              className={s.picker}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              {selectable.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                  {e.id === user.employee.id ? ' (you)' : ''} — {e.designation}
                </option>
              ))}
            </select>
          </Card>
        ) : null}

        <Card
          title={formatMonth(month)}
          actions={
            <>
              <Button onClick={() => setMonth(addMonths(month, -1))}>Previous</Button>
              <Button onClick={() => setMonth(addMonths(month, 1))}>Next</Button>
              <Button variant="quiet" onClick={() => setMonth(MOCK_TODAY.slice(0, 7))}>
                This month
              </Button>
            </>
          }
        >
          <AsyncSection
            state={monthQuery.state}
            reload={monthQuery.reload}
            allowed={allowed}
            deniedLabel="this person’s attendance"
            isEmpty={(days) => days.length === 0}
            empty={
              <div className={s.emptyMonth}>
                <p>No attendance records for {formatMonth(month)}.</p>
                <p className={s.emptyNote}>
                  Records in this build only exist from June 2026 to {formatDate(MOCK_TODAY)}.
                </p>
              </div>
            }
          >
            {(days) => (
              <MonthCalendar month={month} days={days} selected={selected} onSelect={setSelected} />
            )}
          </AsyncSection>
        </Card>

        <Card title="This month, counted">
          <AsyncSection
            state={summaryQuery.state}
            reload={summaryQuery.reload}
            allowed={allowed}
            deniedLabel="this person’s attendance"
            loadingRows={3}
          >
            {(summary) => (
              <>
                <Grid>
                  <Metric value={summary.workingDays} label="Days worked (present + half + pending)" />
                  <Metric value={summary.counts.leave} label="Days on leave" />
                  <Metric value={summary.counts.absent} label="Days absent" />
                  <Metric value={formatHours(summary.totalHours)} label="Hours recorded" />
                </Grid>

                <Working summary="How were these worked out?">
                  <ul className={s.summaryList}>
                    {(Object.keys(summary.counts) as AttendanceStatus[]).map((status) => (
                      <li key={status}>
                        <span>{attendanceStatusLabels[status]}</span>
                        <span>{summary.counts[status]}</span>
                      </li>
                    ))}
                    <li>
                      <span>Days with a record</span>
                      <span>{summary.daysWithRecords}</span>
                    </li>
                    {summary.daysWithoutRecords.length > 0 ? (
                      <li>
                        <span>Past days with no record at all</span>
                        <span>{summary.daysWithoutRecords.length}</span>
                      </li>
                    ) : null}
                    <li>
                      <span>Days worked = present + half day + pending regularisation</span>
                      <span>{summary.workingDays}</span>
                    </li>
                  </ul>
                  <p className={s.workingNote}>
                    Hours are the sum of each day&rsquo;s recorded total. A day with a missing out-punch
                    contributes zero hours until it is regularised — which is why the two numbers can
                    disagree.
                  </p>
                </Working>
              </>
            )}
          </AsyncSection>
        </Card>

        {selected ? <DayDetail employeeId={subjectId} date={selected} canRaise={isSelf} /> : null}
      </Stack>
    </>
  );
}
