'use client';

import { PageHeader, Stack } from '@/components/ui';
import { PolicyList } from '@/components/documents/PolicyList';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';

export default function PoliciesPage() {
  const { user } = useCurrentUser();
  return (
    <>
      <PageHeader title="Policies" description="Read a policy and record that you have." />
      <Stack>
        <PolicyList employeeId={user.employee.id} />
      </Stack>
    </>
  );
}
