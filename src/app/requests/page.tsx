'use client';

import { useState } from 'react';
import { AsyncSection, ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui';
import { ApprovalList } from '@/components/requests/ApprovalList';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { getMyRequests } from '@/data/requests';
import { useAsync } from '@/hooks/useAsync';
import { requestStatusLabels } from '@/lib/labels';
import type { RequestStatus } from '@/lib/types';
import s from './requests.module.css';

const STATUSES: Array<{ value: RequestStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: requestStatusLabels.pending },
  { value: 'approved', label: requestStatusLabels.approved },
  { value: 'rejected', label: requestStatusLabels.rejected },
  { value: 'cancelled', label: requestStatusLabels.cancelled },
];

export default function RequestHistoryPage() {
  const { user } = useCurrentUser();
  const [status, setStatus] = useState<RequestStatus | 'all'>('all');
  const { state, reload } = useAsync(() => getMyRequests(user.employee.id), [user.employee.id]);

  return (
    <>
      <PageHeader
        title="Request History"
        description="Everything you have raised, and what happened to it."
        actions={<ButtonLink href="/requests/new">Raise a request</ButtonLink>}
      />

      <div className={s.chips} role="group" aria-label="Filter by status">
        {STATUSES.map((chip) => (
          <button
            key={chip.value}
            type="button"
            className={`${s.chip} ${status === chip.value ? s.chipActive : ''}`}
            aria-pressed={status === chip.value}
            onClick={() => setStatus(chip.value)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <Card flush>
        <AsyncSection
          state={state}
          reload={reload}
          isEmpty={(rows) =>
            rows.filter((r) => (status === 'all' ? true : r.status === status)).length === 0
          }
          empty={
            <EmptyState
              title="Nothing here"
              body="Leave, work-from-home, regularisation, asset and profile requests you raise all appear here with their status."
            />
          }
        >
          {(rows) => (
            <ApprovalList
              requests={rows.filter((r) => (status === 'all' ? true : r.status === status))}
              showActions={false}
            />
          )}
        </AsyncSection>
      </Card>
    </>
  );
}
