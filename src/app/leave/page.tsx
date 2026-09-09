'use client';

import { ButtonLink, PageHeader, Stack } from '@/components/ui';
import { LeaveBalances } from '@/components/leave/LeaveBalances';
import { LeaveHistory } from '@/components/leave/LeaveHistory';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';

export default function LeavePage() {
  const { user } = useCurrentUser();

  return (
    <>
      <PageHeader
        title="Leave balances"
        description="Your balance per type, and everything you have applied for."
        actions={<ButtonLink href="/leave/apply" variant="primary">Apply for leave</ButtonLink>}
      />
      <Stack>
        <LeaveBalances employeeId={user.employee.id} />
        <LeaveHistory employeeId={user.employee.id} canCancel />
      </Stack>
    </>
  );
}
