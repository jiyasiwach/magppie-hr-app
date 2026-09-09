'use client';

import { useCallback, useState } from 'react';
import { AsyncSection, Card, EmptyState, FilterBar, PageHeader } from '@/components/ui';
import { ApprovalList } from '@/components/requests/ApprovalList';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { commentOnRequest, decideRequest, getApprovalQueue } from '@/data/requests';
import { useAsync } from '@/hooks/useAsync';
import { canSeeApprovals } from '@/lib/permissions';
import { requestStatusLabels, requestTypeLabels } from '@/lib/labels';
import type { RequestStatus, RequestType } from '@/lib/types';

const typeOptions = Object.entries(requestTypeLabels);
const statusOptions = Object.entries(requestStatusLabels);

export default function ApprovalsPage() {
  const { user } = useCurrentUser();
  const [type, setType] = useState('');
  const [status, setStatus] = useState('pending');
  const allowed = canSeeApprovals(user);

  const { state, reload } = useAsync(
    () =>
      getApprovalQueue(user, {
        type: (type || '') as RequestType | '',
        status: (status || '') as RequestStatus | '',
      }),
    [user.employee.id, type, status],
  );

  const act = useCallback(
    async (requestId: string, decision: 'approved' | 'rejected' | 'commented', comment: string) => {
      if (decision === 'commented') await commentOnRequest(user, requestId, comment);
      else await decideRequest(user, requestId, decision, comment);
    },
    [user],
  );

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Every kind of request waiting on you, in one list. Approve, reject or comment without opening each one."
      />

      {allowed ? (
        <FilterBar
          filters={[
            {
              key: 'type',
              label: 'Request type',
              options: typeOptions.map(([, label]) => label),
              value: typeOptions.find(([key]) => key === type)?.[1] ?? '',
              onChange: (label) => setType(typeOptions.find(([, l]) => l === label)?.[0] ?? ''),
            },
            {
              key: 'status',
              label: 'Status',
              options: statusOptions.map(([, label]) => label),
              value: statusOptions.find(([key]) => key === status)?.[1] ?? '',
              onChange: (label) => setStatus(statusOptions.find(([, l]) => l === label)?.[0] ?? ''),
            },
          ]}
          resultCount={state.status === 'ready' ? `${state.data.length} request(s)` : undefined}
          onClear={() => {
            setType('');
            setStatus('');
          }}
        />
      ) : null}

      <Card flush>
        <AsyncSection
          state={state}
          reload={reload}
          allowed={allowed}
          deniedLabel="the approvals queue"
          isEmpty={(rows) => rows.length === 0}
          empty={
            <EmptyState
              title="Nothing waiting on you"
              body="When someone in your team raises leave, a regularisation or a document, it lands here."
            />
          }
        >
          {(rows) => <ApprovalList requests={rows} onAct={act} />}
        </AsyncSection>
      </Card>
    </>
  );
}
