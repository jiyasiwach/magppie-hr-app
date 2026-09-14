'use client';

import { useState } from 'react';
import { AsyncSection, Card, EmptyState, Grid, Metric, PageHeader, Small, Stack } from '@/components/ui';
import { TicketQueue } from '@/components/voice/TicketQueue';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { AGEING_THRESHOLD_DAYS, getCommitteeQueue, getVoiceStats, isCommitteeMember } from '@/data/voice';
import { useAsync } from '@/hooks/useAsync';
import { voiceStatusLabels } from '@/lib/labels';
import type { VoiceStatus } from '@/lib/types';
import s from '@/components/voice/voice.module.css';
import q from '../hr/queue.module.css';

const STATUSES: VoiceStatus[] = ['submitted', 'in-review', 'action-being-taken', 'resolved', 'closed-without-action'];

export default function CommitteeQueuePage() {
  const { user } = useCurrentUser();
  const [status, setStatus] = useState<VoiceStatus | ''>('');
  const allowed = isCommitteeMember(user);

  const { state, reload } = useAsync(
    () => getCommitteeQueue(user, { status }),
    [user.employee.id, status],
  );
  const stats = useAsync(() => getVoiceStats(user, true), [user.employee.id]);

  return (
    <>
      <PageHeader
        title="Internal Committee"
        description="Harassment and misconduct only. General HR cannot open anything here, and nothing here can be moved into the general queue."
      />

      <Stack>
        {allowed ? (
          <>
            <Card>
              <p className={s.warn}>
                These are POSH matters. Handle them under the committee&rsquo;s own process and
                timelines. Confidentiality is a legal obligation, not a courtesy, and retaliation
                against anyone who raises a complaint or takes part in an inquiry is itself a
                disciplinary matter.
              </p>
            </Card>

            <Card title="This month">
              <AsyncSection state={stats.state} reload={stats.reload} loadingRows={2}>
                {(v) =>
                  v ? (
                    <Grid>
                      <Metric value={v.raisedThisMonth} label="Raised this month" />
                      <Metric value={v.open} label="Open now" />
                      <Metric value={v.averageDaysToFirstReply ?? '—'} label="Average days to first reply" />
                      <Metric value={v.ageingBeyondThreshold} label={`Open beyond ${AGEING_THRESHOLD_DAYS} days`} />
                    </Grid>
                  ) : null
                }
              </AsyncSection>
              <p className={s.note} style={{ marginTop: 16 }}>
                <Small>Counts only, and only for this queue.</Small>
              </p>
            </Card>

            <Card>
              <div className={q.filters}>
                <div className={q.field}>
                  <label className={q.label} htmlFor="c-status">
                    Status
                  </label>
                  <select id="c-status" value={status} onChange={(e) => setStatus(e.target.value as VoiceStatus | '')}>
                    <option value="">All</option>
                    {STATUSES.map((v) => (
                      <option key={v} value={v}>
                        {voiceStatusLabels[v]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          </>
        ) : null}

        <TicketQueue
          state={state}
          reload={reload}
          allowed={allowed}
          deniedLabel="the Internal Committee queue"
          showRaiser
          empty={
            <EmptyState
              title="Nothing in the committee queue"
              body="Harassment and misconduct tickets land here, and only here."
            />
          }
        />
      </Stack>
    </>
  );
}
