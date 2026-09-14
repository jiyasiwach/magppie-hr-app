'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AsyncSection,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  Person,
  Small,
  Stack,
  StatusPill,
  type Column,
} from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { listDelegations, resolveChain } from '@/data/organisation';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/lib/date';
import { requestTypeLabels } from '@/lib/labels';
import { canSeeSettings } from '@/lib/permissions';
import type { Delegation, RequestType } from '@/lib/types';
import { employees } from '@/mocks';
import s from './chains.module.css';

const TYPES: RequestType[] = [
  'leave',
  'regularisation',
  'wfh',
  'on-duty',
  'overtime',
  'partial-day',
  'asset',
  'expense',
  'profile-change',
  'document',
];

/**
 * Read-only. HR should be able to check what a request will do without raising
 * a test request to find out.
 */
export default function ApprovalChainsPage() {
  const { user } = useCurrentUser();
  const [requestType, setRequestType] = useState<RequestType>('leave');
  const [employeeId, setEmployeeId] = useState(user.employee.id);

  const allowed = canSeeSettings(user);
  const chainQuery = useAsync(() => resolveChain(requestType, employeeId), [requestType, employeeId]);
  const delegationQuery = useAsync(() => listDelegations(), []);

  const people = [...employees].sort((a, b) => a.fullName.localeCompare(b.fullName));

  const delegationColumns: Column<Delegation>[] = [
    {
      key: 'from',
      header: 'From',
      primary: true,
      render: (d) => (
        <Person
          name={employees.find((e) => e.id === d.fromEmployeeId)?.fullName ?? d.fromEmployeeId}
          href={`/directory/${d.fromEmployeeId}`}
          secondary="approvals handed over"
        />
      ),
    },
    {
      key: 'to',
      header: 'To',
      render: (d) => employees.find((e) => e.id === d.toEmployeeId)?.fullName ?? d.toEmployeeId,
    },
    { key: 'period', header: 'Period', render: (d) => `${formatDate(d.validFrom)} – ${formatDate(d.validTo)}` },
    { key: 'reason', header: 'Reason', render: (d) => d.reason },
  ];

  return (
    <>
      <PageHeader
        title="Approval chains"
        description="What route a request takes, who it lands on, and what would change it. Read-only."
      />

      <Stack>
        <Card>
          <div className={s.pickers}>
            <div className={s.field}>
              <label className={s.label} htmlFor="chain-type">
                Request type
              </label>
              <select
                id="chain-type"
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as RequestType)}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {requestTypeLabels[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="chain-person">
                Raised by
              </label>
              <select id="chain-person" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                {people.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} — {e.department}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className={s.note}>
            <Small>
              The chain is chosen by the raiser&rsquo;s policy group first, then their entity, then a
              company-wide default. Changing the person can change the chain.
            </Small>
          </p>
        </Card>

        <AsyncSection
          state={chainQuery.state}
          reload={chainQuery.reload}
          allowed={allowed}
          deniedLabel="approval chains"
          isEmpty={(c) => c === null}
          empty={
            <EmptyState
              title="No chain configured"
              body="Nothing routes this request type for this person yet, so it would fall back to their manager."
            />
          }
          loadingRows={4}
        >
          {(chain) => {
            if (!chain) return null;
            return (
              <Card title={chain.chainName} hint="Steps run in order. Nothing here ever auto-approves.">
                <ol className={s.steps}>
                  {chain.steps.map((step) => (
                    <li key={step.step.id} className={s.step}>
                      <span className={s.stepNumber}>{step.step.position}</span>
                      <div className={s.stepBody}>
                        <div className={s.stepTop}>
                          <strong>{step.roleLabel}</strong>
                          {step.conditionText ? (
                            <StatusPill label={`Only if ${step.conditionText}`} tone="warning" />
                          ) : (
                            <StatusPill label="Always" tone="quiet" />
                          )}
                        </div>

                        <span className={s.stepMeta}>
                          {step.approver ? (
                            <>
                              Currently{' '}
                              <Link href={`/directory/${step.approver.id}`}>{step.approver.fullName}</Link>
                            </>
                          ) : (
                            'Nobody currently fills this role for this person'
                          )}
                        </span>

                        {step.delegation && step.actingFor ? (
                          <span className={s.delegated}>
                            Delegated to <strong>{step.actingFor.fullName}</strong> until{' '}
                            {formatDate(step.delegation.validTo)} — {step.delegation.reason}. The trail
                            will show who actually approved and on whose behalf.
                          </span>
                        ) : null}

                        <span className={s.stepMeta}>
                          {step.step.escalationDays
                            ? `Untouched for ${step.step.escalationDays} days, the next level is notified. It is never approved automatically.`
                            : 'No escalation set.'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            );
          }}
        </AsyncSection>

        <Card title="Delegations" hint="An approver's authority, handed over for a dated period" flush>
          <AsyncSection
            state={delegationQuery.state}
            reload={delegationQuery.reload}
            allowed={allowed}
            deniedLabel="delegations"
            isEmpty={(rows) => rows.length === 0}
            empty={
              <EmptyState
                title="No delegations"
                body="When an approver is away, their approvals can be routed to a named delegate for a set period. Without that, a long leave blocks everyone behind it."
              />
            }
          >
            {(rows) => (
              <DataTable rows={rows} columns={delegationColumns} rowKey={(d) => d.id} caption="Delegations" />
            )}
          </AsyncSection>
        </Card>
      </Stack>
    </>
  );
}
