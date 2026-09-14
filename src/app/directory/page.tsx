'use client';

import { useState } from 'react';
import {
  AsyncSection,
  ButtonLink,
  Card,
  DataTable,
  EmptyState,
  FilterBar,
  PageHeader,
  Person,
  StatusPill,
  type Column,
} from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { listEmployees } from '@/data/directory';
import { useAsync } from '@/hooks/useAsync';
import { employeeStatusLabels, employeeStatusTones, employmentTypeLabels } from '@/lib/labels';
import type { Employee, EmployeeStatus } from '@/lib/types';
import { departments, designations, entities, locations } from '@/mocks';

const statusOptions = Object.entries(employeeStatusLabels);

export default function DirectoryPage() {
  const { user } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [designation, setDesignation] = useState('');
  const [status, setStatus] = useState('');
  const [entityId, setEntityId] = useState('');

  const { state, reload } = useAsync(
    () => listEmployees({ search, department, location, designation, status, entityId }),
    [search, department, location, designation, status, entityId],
  );

  const columns: Column<Employee>[] = [
    {
      key: 'name',
      header: 'Name',
      primary: true,
      render: (e) => (
        <Person name={e.fullName} href={`/directory/${e.id}`} secondary={e.employeeCode} />
      ),
    },
    { key: 'designation', header: 'Designation', render: (e) => e.designation },
    { key: 'department', header: 'Department', render: (e) => e.department },
    {
      key: 'entity',
      header: 'Entity',
      render: (e) => entities.find((x) => x.id === e.entityId)?.shortName ?? '—',
    },
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
            ? 'Everyone across every Magppie company. You can edit any profile.'
            : 'Everyone across every Magppie company. Personal details are visible only for you and, if you manage people, your team.'
        }
        actions={<ButtonLink href="/directory/tree">Reporting tree</ButtonLink>}
      />

      <FilterBar
        search={{ value: search, onChange: setSearch }}
        filters={[
          {
            key: 'entity',
            label: 'Entity',
            options: entities.map((e) => e.shortName),
            value: entities.find((e) => e.id === entityId)?.shortName ?? '',
            onChange: (name) => setEntityId(entities.find((e) => e.shortName === name)?.id ?? ''),
          },
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
          setEntityId('');
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
