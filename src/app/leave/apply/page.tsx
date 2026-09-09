'use client';

import { ButtonLink, PageHeader, Stack } from '@/components/ui';
import { LeaveRequestForm } from '@/components/leave/LeaveRequestForm';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';

export default function ApplyLeavePage() {
  const { user } = useCurrentUser();
  return (
    <>
      <PageHeader
        title="Apply for leave"
        description="Goes to your reporting manager. Pending leave is not debited from your balance until it is approved."
        actions={<ButtonLink href="/leave">Leave balances</ButtonLink>}
      />
      <Stack>
        <LeaveRequestForm employeeId={user.employee.id} />
      </Stack>
    </>
  );
}
