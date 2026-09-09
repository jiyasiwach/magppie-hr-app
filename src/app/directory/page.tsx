'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AsyncSection,
  ButtonLink,
  Card,
  DataTable,
  EmptyState,
  FilterBar,
  Muted,
  PageHeader,
  StatusPill,
  type Column,
} from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { listEmployees } from '@/data/directory';
import { useAsync } from '@/hooks/useAsync';
import { employeeStatusLabels, employeeStatusTones, employmentTypeLabels } from '@/lib/labels';
import type { Employee, EmployeeStatus } from '@/lib/types';
import { departments, designations, locations } from '@/mocks';

const statusOptions = Object.entries(employeeStatusLabels);

export default function DirectoryPage() {
  const { user } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [designation, setDesignation] = useState('');
  const [status, setStatus] = useState('');

  const { state, reload } = useAsync(
    () => listEmployees({ search, department, location, designation, status }),
    [search, department, location, designation, status],
  );

  const columns: Column<Employee>[] = [
    {
      key: 'name',
      header: 'Name',
      primary: true,
      render: (e) => (
        <div>
          <Link href={`/directory/${e.id}`}>{e.fullName}</Link>{' '}
          <Muted>
            <span style={{ fontSize: 12 }}>{e.employeeCode}</span>
          </Muted>
        </div>
      ),
    },
    { key: 'designation', header: 'Designation', render: (e) => e.designation },
    { key: 'department', header: 'Department', render: (e) => e.department },
    { key: 'location', header: 'Location', render: (e) => e.location },
    { key: 'type', header: 'Type', render: (e) => employmentTypeLabels[e.employmentType] },
    {
      key: 'status',
      header: 'Status',
      render: (e) => (
        <StatusPill label={employeeStatusLabels[e.status]} tone={employeeStatusTones[e.status]} />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Directory"
        description={
          user.role === 'hr-admin'
            ? 'Everyone at Magppie. You can edit any profile.'
            : 'Everyone at Magppie. Personal details are visible only for you and, if you manage people, your team.'
        }
        actions={<ButtonLink href="/directory/tree">Reporting tree</ButtonLink>}
      />

      <FilterBar
        search={{ value: search, onChange: setSearch }}
        filters={[
          { key: 'department', label: 'Department', options: departments, value: department, onChange: setDepartment },
          { key: 'location', label: 'Location', options: locations, value: location, onChange: setLocation },
          { key: 'designation', label: 'Designation', options: designations, value: designation, onChange: setDesignation },
          {
            key: 'status',
            label: 'Status',
            options: statusOptions.map(([, label]) => label),
            value: statusOptions.find(([key]) => key === status)?.[1] ?? '',
            onChange: (label) =>
              setStatus((statusOptions.find(([, l]) => l === label)?.[0] as EmployeeStatus) ?? ''),
          },
        ]}
        resultCount={state.status === 'ready' ? `${state.data.length} of 40 people` : undefined}
        onClear={() => {
          setSearch('');
          setDepartment('');
          setLocation('');
          setDesignation('');
          setStatus('');
        }}
      />

      <Card flush>
        <AsyncSection
          state={state}
          reload={reload}
          isEmpty={(rows) => rows.length === 0}
          empty={
            <EmptyState
              title="Nobody matches these filters"
              body="Try clearing a filter or searching by employee code instead."
            />
          }
        >
          {(rows) => (
            <DataTable rows={rows} columns={columns} rowKey={(e) => e.id} caption="Employee directory" />
          )}
        </AsyncSection>
      </Card>
    </>
  );
}
