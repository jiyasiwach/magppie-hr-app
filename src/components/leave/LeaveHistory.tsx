'use client';

import { AsyncSection, Button, Card, DataTable, EmptyState, StatusPill, type Column } from '@/components/ui';
import { cancelLeaveRequest, getLeaveRequests, leaveDays } from '@/data/leave';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/lib/date';
import { leaveStatusLabels, leaveStatusTones } from '@/lib/labels';
import type { LeaveRequest } from '@/lib/types';
import { leaveTypes } from '@/mocks';

export function LeaveHistory({ employeeId, canCancel }: { employeeId: string; canCancel: boolean }) {
  const { state, reload } = useAsync(() => getLeaveRequests(employeeId), [employeeId]);

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'dates',
      header: 'Dates',
      primary: true,
      render: (r) =>
        r.startDate === r.endDate
          ? formatDate(r.startDate)
          : `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`,
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) => leaveTypes.find((t) => t.id === r.leaveTypeId)?.name ?? r.leaveTypeId,
    },
    { key: 'days', header: 'Days', render: (r) => leaveDays(r) },
    { key: 'reason', header: 'Reason', render: (r) => r.reason },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusPill label={leaveStatusLabels[r.status]} tone={leaveStatusTones[r.status]} />,
    },
    {
      key: 'actions',
      header: '',
      render: (r) =>
        canCancel && r.status === 'pending' ? (
          <Button variant="quiet" onClick={() => void cancelLeaveRequest(r.id)}>
            Cancel
          </Button>
        ) : null,
    },
  ];

  return (
    <Card title="Leave history" hint="Cancelled requests are kept — nothing is deleted." flush>
      <AsyncSection
        state={state}
        reload={reload}
        isEmpty={(rows) => rows.length === 0}
        empty={<EmptyState title="No leave applied for yet" body="Requests you send will be listed here with their status." />}
      >
        {(rows) => <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} caption="Leave history" />}
      </AsyncSection>
    </Card>
  );
}
