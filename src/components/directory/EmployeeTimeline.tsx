'use client';

import { AsyncSection, Card, EmptyState, Small, StatusPill } from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { LND_CONNECTED } from '@/data/lnd';
import { canSeeTimeline, getTimeline, timelineVisibleTo } from '@/data/timeline';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/lib/date';
import { timelineTypeLabels, timelineTypeTones } from '@/lib/labels';
import { isSelf } from '@/lib/permissions';
import s from './timeline.module.css';

/**
 * One continuous record of a person's time at the company, built from the
 * records that caused each entry rather than typed in. If this and the records
 * ever disagree, this is wrong and can be regenerated.
 */
export function EmployeeTimeline({ employeeId }: { employeeId: string }) {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getTimeline(employeeId), [employeeId]);
  const allowed = canSeeTimeline(user, employeeId);
  const managerView = !isSelf(user, employeeId) && user.role !== 'hr-admin';

  return (
    <Card
      title="Record"
      hint={
        managerView
          ? 'Job-related entries for your team member'
          : 'Every entry is generated from the record that caused it'
      }
    >
      <AsyncSection
        state={state}
        reload={reload}
        allowed={allowed}
        deniedLabel="this person’s record"
        isEmpty={(rows) => timelineVisibleTo(user, employeeId, rows).length === 0}
        empty={<EmptyState title="Nothing recorded yet" body="Joining, role changes, transfers and training appear here." />}
        loadingRows={4}
      >
        {(rows) => {
          const visible = timelineVisibleTo(user, employeeId, rows);
          return (
            <>
              <ol className={s.timeline}>
                {visible.map((entry) => (
                  <li key={entry.id} className={s.entry}>
                    <span className={s.date}>{formatDate(entry.date)}</span>
                    <span className={s.marker} aria-hidden="true" />
                    <span className={s.body}>
                      <span className={s.top}>
                        <StatusPill
                          label={timelineTypeLabels[entry.type] ?? entry.type}
                          tone={timelineTypeTones[entry.type] ?? 'neutral'}
                        />
                        {entry.sourceModule === 'l&d' ? <StatusPill label="L&D portal" tone="info" /> : null}
                      </span>
                      <span className={s.description}>{entry.description}</span>
                    </span>
                  </li>
                ))}
              </ol>

              {managerView ? (
                <p className={s.note}>
                  <Small>
                    You are seeing the job-related entries only. The full record is visible to the
                    person themselves and to HR.
                  </Small>
                </p>
              ) : null}

              {!LND_CONNECTED ? (
                <p className={s.note}>
                  <Small>
                    Training and assessment entries are placeholder data. The L&amp;D portal is not
                    connected yet — see <code>src/data/lnd.ts</code> for exactly what it needs to
                    expose.
                  </Small>
                </p>
              ) : null}
            </>
          );
        }}
      </AsyncSection>
    </Card>
  );
}
