'use client';

import Link from 'next/link';
import {
  AsyncSection,
  Card,
  EmptyState,
  Grid,
  Muted,
  PageHeader,
  Small,
  Stack,
  StatusPill,
} from '@/components/ui';
import { PunchControl } from '@/components/attendance/PunchControl';
import { RequestCard } from '@/components/requests/ApprovalList';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { getHomeSummary } from '@/data/home';
import { markNotificationRead } from '@/data/notifications';
import { useAsync } from '@/hooks/useAsync';
import { MOCK_TODAY } from '@/lib/clock';
import { formatDate, formatDayName, formatTimestamp } from '@/lib/date';
import { roleGreeting } from '@/lib/home';
import s from './home.module.css';

export default function HomePage() {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getHomeSummary(user), [user.employee.id]);

  return (
    <>
      <PageHeader
        title={`${roleGreeting(user)}, ${user.employee.fullName.split(' ')[0]}`}
        description={`${formatDayName(MOCK_TODAY)}, ${formatDate(MOCK_TODAY)}. Everything on this screen comes from mock data.`}
      />

      <AsyncSection state={state} reload={reload} loadingRows={6}>
        {(home) => (
          <Stack>
            {home.today.holidayName ? (
              <Card title="Today">
                <p className={s.stack}>
                  <StatusPill label="Holiday" tone="quiet" /> {home.today.holidayName}
                </p>
              </Card>
            ) : (
              <PunchControl employeeId={user.employee.id} />
            )}

            <Grid>
              <Card title="Leave balance">
                {home.leave.length === 0 ? (
                  <p className={s.plain}>
                    No leave has been credited to you yet, so every balance is zero.
                  </p>
                ) : (
                  <ul className={s.balanceList}>
                    {home.leave.map((b) => (
                      <li key={b.leaveTypeId}>
                        <span>{b.name}</span>
                        <strong>{b.balance}</strong>
                      </li>
                    ))}
                  </ul>
                )}
                <p className={s.linkRow}>
                  <Link href="/leave">See how each balance was worked out</Link>
                </p>
              </Card>

              <Card title="Your open items">
                <ul className={s.itemList}>
                  <li>
                    <span>Requests you raised, still pending</span>
                    <strong>{home.myOpenRequests.length}</strong>
                  </li>
                  <li>
                    <span>Policies not yet acknowledged</span>
                    <strong>{home.unacknowledgedPolicies}</strong>
                  </li>
                  <li>
                    <span>Upcoming or current leave</span>
                    <strong>{home.upcomingLeave.length}</strong>
                  </li>
                </ul>
                {home.upcomingLeave.length > 0 ? (
                  <ul className={s.plainList}>
                    {home.upcomingLeave.map((l) => (
                      <li key={l.id}>
                        {formatDate(l.startDate)}
                        {l.startDate === l.endDate ? '' : ` – ${formatDate(l.endDate)}`}{' '}
                        <Muted>
                          <Small>{l.status}</Small>
                        </Muted>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className={s.linkRow}>
                  <Link href="/documents">Open documents and policies</Link>
                </p>
              </Card>
            </Grid>

            <Card
              title="Waiting on you"
              hint="Requests you have to decide"
              flush
            >
              {home.waitingOnMe.length === 0 ? (
                <EmptyState
                  title="Nothing is waiting on you"
                  body={
                    user.role === 'employee'
                      ? 'You do not approve anything — this stays empty unless that changes.'
                      : 'When your team raises something, it appears here and in Approvals.'
                  }
                />
              ) : (
                <ul className={s.requestList}>
                  {home.waitingOnMe.slice(0, 3).map((r) => (
                    <RequestCard key={r.id} request={r} showActions={false} />
                  ))}
                  {home.waitingOnMe.length > 3 ? (
                    <li className={s.moreRow}>
                      <Link href="/approvals">
                        See all {home.waitingOnMe.length} in Approvals
                      </Link>
                    </li>
                  ) : null}
                </ul>
              )}
            </Card>

            <Card title="Recent notifications">
                {home.notifications.length === 0 ? (
                  <p className={s.plain}>Nothing yet.</p>
                ) : (
                  <ul className={s.notifications}>
                    {home.notifications.map((n) => (
                      <li key={n.id} className={n.read ? s.read : undefined}>
                        <button
                          type="button"
                          className={s.notificationButton}
                          onClick={() => void markNotificationRead(n.id)}
                        >
                          <strong>{n.title}</strong>
                          <span className={s.notificationBody}>{n.body}</span>
                          <span className={s.notificationMeta}>
                            {formatTimestamp(n.createdOn)}
                            {n.read ? '' : ' · unread'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
            </Card>
          </Stack>
        )}
      </AsyncSection>
    </>
  );
}
