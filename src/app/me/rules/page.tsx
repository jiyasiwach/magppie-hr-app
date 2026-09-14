'use client';

import { useState } from 'react';
import {
  AsyncSection,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  Small,
  Stack,
  StatusPill,
  type Column,
} from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { getRulesFor } from '@/data/organisation';
import { useAsync } from '@/hooks/useAsync';
import { canViewPersonalData, visibleEmployeeIds } from '@/lib/permissions';
import type { LeavePolicyRule } from '@/lib/types';
import { employees, leaveTypes } from '@/mocks';
import s from './rules.module.css';

/**
 * People argue about leave rules constantly. This screen exists so the app can
 * answer, in plain words, rather than sending them to a PDF.
 */
export default function MyRulesPage() {
  const { user } = useCurrentUser();
  const [subjectId, setSubjectId] = useState(user.employee.id);
  const { state, reload } = useAsync(() => getRulesFor(subjectId), [subjectId]);

  const selectable = employees
    .filter((e) => visibleEmployeeIds(user).includes(e.id))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const columns: Column<LeavePolicyRule>[] = [
    {
      key: 'type',
      header: 'Leave type',
      primary: true,
      render: (r) => leaveTypes.find((t) => t.id === r.leaveTypeId)?.name ?? r.leaveTypeId,
    },
    {
      key: 'accrual',
      header: 'You earn',
      render: (r) =>
        r.accrualFrequency === 'none'
          ? 'Not earned — granted when it applies'
          : `${r.accrualRate} day${r.accrualRate === 1 ? '' : 's'} ${r.accrualFrequency}`,
    },
    {
      key: 'carry',
      header: 'Carry forward',
      render: (r) => (r.maxCarryForward > 0 ? `Up to ${r.maxCarryForward} days` : 'None — it lapses'),
    },
    { key: 'encash', header: 'Encashable', render: (r) => (r.encashable ? 'Yes' : 'No') },
    {
      key: 'negative',
      header: 'Can go negative',
      render: (r) => (r.canGoNegative ? `Yes, up to ${r.maxNegativeDays} days` : 'No'),
    },
  ];

  return (
    <>
      <PageHeader
        title={subjectId === user.employee.id ? 'My working rules' : 'Working rules'}
        description="Which group you are in, and exactly what that means for your leave, your shift and your week off."
      />

      <Stack>
        {selectable.length > 1 ? (
          <Card>
            <label className={s.label} htmlFor="rules-subject">
              Whose rules
            </label>
            <select
              id="rules-subject"
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

        <AsyncSection
          state={state}
          reload={reload}
          allowed={canViewPersonalData(user, subjectId)}
          deniedLabel="this person’s working rules"
          isEmpty={(r) => r === null}
          empty={<EmptyState title="No rules found" body="This person is not assigned to a policy group." />}
          loadingRows={4}
        >
          {(rules) => {
            if (!rules) return null;
            return (
              <Stack>
                <Card title="In plain words">
                  <ul className={s.plain}>
                    {rules.plainEnglish.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                  <p className={s.flag}>
                    <Small>
                      Every rule on this screen is a placeholder. Magppie has not written these down
                      yet, so they were invented to give the app something to work against. Do not
                      rely on them.
                    </Small>
                  </p>
                </Card>

                <Card title="Where these come from">
                  <div className={s.chain}>
                    <span>
                      <span className={s.chainLabel}>Entity</span>
                      {rules.entity?.legalName ?? '—'}
                    </span>
                    <span>
                      <span className={s.chainLabel}>Policy group</span>
                      {rules.group?.name ?? '—'}
                      {rules.group ? <StatusPill label={rules.group.description} tone="quiet" /> : null}
                    </span>
                    <span>
                      <span className={s.chainLabel}>Leave policy</span>
                      {rules.leavePolicy?.name ?? '—'}
                    </span>
                    <span>
                      <span className={s.chainLabel}>Attendance policy</span>
                      {rules.attendancePolicy?.name ?? '—'}
                    </span>
                    <span>
                      <span className={s.chainLabel}>Holiday calendar</span>
                      {rules.holidayCalendar?.name ?? '—'}
                    </span>
                    <span>
                      <span className={s.chainLabel}>Week off</span>
                      {rules.weekOff?.name ?? '—'}
                    </span>
                  </div>
                  <p className={s.note}>
                    <Small>
                      These are records, not code. An HR admin changes an accrual rate by editing the
                      leave policy — no developer involved. If a rule ever cannot be expressed as data
                      here, that is a design failure worth raising rather than working around.
                    </Small>
                  </p>
                </Card>

                <Card title="Your leave, rule by rule" flush>
                  {rules.leavePolicy ? (
                    <DataTable
                      rows={rules.leavePolicy.rules}
                      columns={columns}
                      rowKey={(r) => r.leaveTypeId}
                      caption="Leave rules for this policy group"
                    />
                  ) : (
                    <EmptyState title="No leave policy" body="This group has no leave policy attached." />
                  )}
                </Card>
              </Stack>
            );
          }}
        </AsyncSection>
      </Stack>
    </>
  );
}
