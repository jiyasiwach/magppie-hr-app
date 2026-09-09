'use client';

import { useState } from 'react';
import { AsyncSection, Card, PageHeader, Stack } from '@/components/ui';
import { LeaveBalances } from '@/components/leave/LeaveBalances';
import { LeaveHistory } from '@/components/leave/LeaveHistory';
import { LeaveRequestForm } from '@/components/leave/LeaveRequestForm';
import { TeamCalendar } from '@/components/leave/TeamCalendar';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { listTeam } from '@/data/directory';
import { useAsync } from '@/hooks/useAsync';
import { canSeeTeamCalendar } from '@/lib/permissions';
import s from './leave.module.css';

type Tab = 'mine' | 'team';

export default function LeavePage() {
  const { user } = useCurrentUser();
  const [tab, setTab] = useState<Tab>('mine');
  const showTeam = canSeeTeamCalendar(user);
  const teamQuery = useAsync(() => listTeam(user), [user.employee.id]);

  return (
    <>
      <PageHeader
        title="My leave"
        description="Your balance, a request form, and everything you have applied for."
      />

      {showTeam ? (
        <div className={s.tabs} role="tablist" aria-label="Leave views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'mine'}
            className={`${s.tab} ${tab === 'mine' ? s.tabActive : ''}`}
            onClick={() => setTab('mine')}
          >
            My leave
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'team'}
            className={`${s.tab} ${tab === 'team' ? s.tabActive : ''}`}
            onClick={() => setTab('team')}
          >
            Team calendar
          </button>
        </div>
      ) : null}

      {tab === 'mine' ? (
        <Stack>
          <LeaveBalances employeeId={user.employee.id} />
          <LeaveRequestForm employeeId={user.employee.id} />
          <LeaveHistory employeeId={user.employee.id} canCancel />
        </Stack>
      ) : (
        <Stack>
          <AsyncSection
            state={teamQuery.state}
            reload={teamQuery.reload}
            allowed={showTeam}
            deniedLabel="the team calendar"
            loadingRows={5}
          >
            {(team) => <TeamCalendar team={team} />}
          </AsyncSection>
          <Card title="Before you approve">
            <p className={s.note}>
              The calendar shows approved leave filled in and pending leave outlined, so a clash is
              visible before a decision is made. Whether a clash should actually block an approval is a
              policy question nobody has answered — this screen shows it, it does not enforce it.
            </p>
          </Card>
        </Stack>
      )}
    </>
  );
}
