'use client';

import { useState } from 'react';
import { AsyncSection, Card, EmptyState, Grid, Metric, PageHeader, Small, Stack } from '@/components/ui';
import { TicketQueue } from '@/components/voice/TicketQueue';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { AGEING_THRESHOLD_DAYS, getHrQueue, getVoiceStats, isVoiceHandler } from '@/data/voice';
import { useAsync } from '@/hooks/useAsync';
import { voiceCategoryLabels, voiceStatusLabels } from '@/lib/labels';
import type { VoiceCategory, VoiceStatus } from '@/lib/types';
import s from '@/components/voice/voice.module.css';
import q from './queue.module.css';

const CATEGORIES: VoiceCategory[] = [
  'workplace',
  'pay-leave-attendance',
  'policy-process',
  'manager-team',
  'suggestion',
  'other',
];

const STATUSES: VoiceStatus[] = ['submitted', 'in-review', 'action-being-taken', 'resolved', 'closed-without-action'];

export default function HrQueuePage() {
  const { user } = useCurrentUser();
  const [category, setCategory] = useState<VoiceCategory | ''>('');
  const [status, setStatus] = useState<VoiceStatus | ''>('');
  const allowed = isVoiceHandler(user);

  const { state, reload } = useAsync(
    () => getHrQueue(user, { category, status }),
    [user.employee.id, category, status],
  );
  const stats = useAsync(() => getVoiceStats(user, false), [user.employee.id]);

  return (
    <>
      <PageHeader
        title="HR queue"
        description="Everything raised, oldest and untouched at the top. Harassment tickets are not here — they go only to the Internal Committee."
      />

      <Stack>
        {allowed ? (
          <Card title="This month">
            <AsyncSection state={stats.state} reload={stats.reload} loadingRows={2}>
              {(v) =>
                v ? (
                  <>
                    <Grid>
                      <Metric value={v.raisedThisMonth} label="Raised this month" />
                      <Metric value={v.open} label="Open now" />
                      <Metric value={v.averageDaysToFirstReply ?? '—'} label="Average days to first reply" />
                      <Metric value={v.averageDaysToClose ?? '—'} label="Average days to close" />
                      <Metric
                        value={v.ageingBeyondThreshold}
                        label={`Open beyond ${AGEING_THRESHOLD_DAYS} days`}
                      />
                    </Grid>
                    <p className={s.note} style={{ marginTop: 16 }}>
                      <Small>
                        Volumes only. There is deliberately nothing here about who raises tickets or
                        how often — counting complaints by person is how a listening channel becomes a
                        surveillance channel.
                      </Small>
                    </p>
                  </>
                ) : null
              }
            </AsyncSection>
          </Card>
        ) : null}

        {allowed ? (
          <Card>
            <div className={q.filters}>
              <div className={q.field}>
                <label className={q.label} htmlFor="q-cat">
                  Category
                </label>
                <select id="q-cat" value={category} onChange={(e) => setCategory(e.target.value as VoiceCategory | '')}>
                  <option value="">All</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {voiceCategoryLabels[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className={q.field}>
                <label className={q.label} htmlFor="q-status">
                  Status
                </label>
                <select id="q-status" value={status} onChange={(e) => setStatus(e.target.value as VoiceStatus | '')}>
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
        ) : null}

        <TicketQueue
          state={state}
          reload={reload}
          allowed={allowed}
          deniedLabel="the HR queue"
          showRaiser
          empty={
            <EmptyState
              title="Nothing in the queue"
              body="Complaints, questions and suggestions raised by anyone in the company land here."
            />
          }
        />
      </Stack>
    </>
  );
}
