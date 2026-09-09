'use client';

import { useState } from 'react';
import { Card, PageHeader, Stack } from '@/components/ui';
import { DocumentsPanel } from '@/components/documents/DocumentsPanel';
import { PolicyList } from '@/components/documents/PolicyList';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { visibleEmployeeIds } from '@/lib/permissions';
import { employees } from '@/mocks';
import s from './documents.module.css';

export default function DocumentsPage() {
  const { user } = useCurrentUser();
  const [subjectId, setSubjectId] = useState(user.employee.id);

  const selectable = employees
    .filter((e) => visibleEmployeeIds(user).includes(e.id))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const isSelf = subjectId === user.employee.id;

  return (
    <>
      <PageHeader
        title="Documents"
        description={
          user.role === 'employee'
            ? 'Your documents and the policies you need to acknowledge.'
            : 'Documents per person, grouped by type, plus policy acknowledgements.'
        }
      />

      <Stack>
        {selectable.length > 1 ? (
          <Card>
            <label className={s.label} htmlFor="doc-subject">
              Whose documents
            </label>
            <select
              id="doc-subject"
              className={s.picker}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              {selectable.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                  {e.id === user.employee.id ? ' (you)' : ''} — {e.designation}
                </option>
              ))}
            </select>
          </Card>
        ) : null}

        <DocumentsPanel employeeId={subjectId} />
        <PolicyList employeeId={subjectId} readOnly={!isSelf} />
      </Stack>
    </>
  );
}
