'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import {
  AsyncSection,
  Button,
  Card,
  EmptyState,
  Grid,
  Muted,
  PageHeader,
  Stack,
  StatusPill,
  Small,
} from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { DocumentsPanel } from '@/components/documents/DocumentsPanel';
import { getActivityTrail, getEmployee, getEmploymentHistory, getManagerChain } from '@/data/directory';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/lib/date';
import {
  employeeStatusLabels,
  employeeStatusTones,
  employmentTypeLabels,
} from '@/lib/labels';
import {
  canEditEmployeeFully,
  canViewPersonalData,
  isSelf,
  selfEditableFields,
} from '@/lib/permissions';
import s from './profile.module.css';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      <span className={s.fieldValue}>{value}</span>
    </div>
  );
}

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useCurrentUser();
  const [editing, setEditing] = useState(false);

  const employeeQuery = useAsync(() => getEmployee(id), [id]);
  const historyQuery = useAsync(() => getEmploymentHistory(id), [id]);
  const chainQuery = useAsync(() => getManagerChain(id), [id]);
  const activityQuery = useAsync(() => getActivityTrail(id), [id]);

  const canSeePersonal = canViewPersonalData(user, id);
  const canEditAll = canEditEmployeeFully(user);
  const canEditSome = isSelf(user, id);

  return (
    <AsyncSection
      state={employeeQuery.state}
      reload={employeeQuery.reload}
      isEmpty={(e) => e === null}
      empty={<EmptyState title="No such person" body="This employee id does not exist in the directory." />}
    >
      {(employee) => {
        if (!employee) return null;
        return (
          <>
            <PageHeader
              title={employee.fullName}
              description={`${employee.designation} · ${employee.department} · ${employee.employeeCode}`}
              actions={
                <>
                  <StatusPill
                    label={employeeStatusLabels[employee.status]}
                    tone={employeeStatusTones[employee.status]}
                  />
                  {canEditAll || canEditSome ? (
                    <Button onClick={() => setEditing((v) => !v)}>
                      {editing ? 'Done' : canEditAll ? 'Edit profile' : 'Edit my details'}
                    </Button>
                  ) : null}
                </>
              }
            />

            <Stack>
              {employee.status === 'probation' && employee.probationEndDate ? (
                <Card>
                  <Small>
                    On probation until {formatDate(employee.probationEndDate)}. What happens at the end of
                    probation has not been specified — no confirmation flow exists in this pass.
                  </Small>
                </Card>
              ) : null}

              <Card title="Personal details" hint={canSeePersonal ? undefined : 'Visible to this person, their manager and HR only'}>
                {canSeePersonal ? (
                  <Grid>
                    <Field label="Full name" value={employee.fullName} />
                    <Field label="Work email" value={<a href={`mailto:${employee.workEmail}`}>{employee.workEmail}</a>} />
                    <Field
                      label="Personal phone"
                      value={
                        editing && (canEditAll || canEditSome) ? (
                          <input defaultValue={employee.personalPhone} aria-label="Personal phone" />
                        ) : (
                          employee.personalPhone
                        )
                      }
                    />
                    <Field label="Photo" value={employee.photo ?? <Muted>Not uploaded</Muted>} />
                  </Grid>
                ) : (
                  <EmptyState
                    title="Personal details are not visible to you"
                    body="You can see this person's job details and how they fit in the reporting tree, but not their personal contact information."
                  />
                )}
                {editing && !canEditAll ? (
                  <p className={s.note}>
                    You can change {selfEditableFields.join(' and ')}. Everything else is changed by HR.
                    Saving is not wired up in this pass.
                  </p>
                ) : null}
                {editing && canEditAll ? (
                  <p className={s.note}>HR can edit every field. Saving is not wired up in this pass.</p>
                ) : null}
              </Card>

              <Card title="Job details">
                <Grid>
                  <Field label="Department" value={employee.department} />
                  <Field label="Designation" value={employee.designation} />
                  <Field
                    label="Manager"
                    value={
                      employee.managerId ? (
                        <Link href={`/directory/${employee.managerId}`}>
                          <ManagerName id={employee.managerId} />
                        </Link>
                      ) : (
                        <Muted>No manager — top of the reporting tree</Muted>
                      )
                    }
                  />
                  <Field label="Joining date" value={formatDate(employee.joiningDate)} />
                  <Field label="Location" value={employee.location} />
                  <Field label="Employment type" value={employmentTypeLabels[employee.employmentType]} />
                  <Field label="Employee code" value={employee.employeeCode} />
                  <Field
                    label="Probation ends"
                    value={employee.probationEndDate ? formatDate(employee.probationEndDate) : <Muted>—</Muted>}
                  />
                </Grid>

                <div className={s.subSection}>
                  <h3>Reporting line</h3>
                  <AsyncSection state={chainQuery.state} reload={chainQuery.reload} loadingRows={2}>
                    {(chain) =>
                      chain.length === 0 ? (
                        <Muted>Reports to nobody — this is the top of the tree.</Muted>
                      ) : (
                        <ol className={s.chain}>
                          {chain.map((m) => (
                            <li key={m.id}>
                              <Link href={`/directory/${m.id}`}>{m.fullName}</Link>{' '}
                              <Muted>
                                <Small>{m.designation}</Small>
                              </Muted>
                            </li>
                          ))}
                        </ol>
                      )
                    }
                  </AsyncSection>
                  <Link href={`/directory/tree?root=${employee.id}`} className={s.treeLink}>
                    See the reporting tree from here
                  </Link>
                </div>

                <div className={s.subSection}>
                  <h3>Employment history</h3>
                  <AsyncSection
                    state={historyQuery.state}
                    reload={historyQuery.reload}
                    loadingRows={2}
                    isEmpty={(rows) => rows.length === 0}
                    empty={<EmptyState title="No employment records" />}
                  >
                    {(rows) => (
                      <ul className={s.plainList}>
                        {rows.map((r) => (
                          <li key={r.id}>
                            <strong>{r.designation}</strong>, {r.department}{' '}
                            <Muted>
                              <Small>
                                {formatDate(r.validFrom)} – {r.validTo ? formatDate(r.validTo) : 'present'}
                              </Small>
                            </Muted>
                          </li>
                        ))}
                      </ul>
                    )}
                  </AsyncSection>
                </div>
              </Card>

              <DocumentsPanel employeeId={employee.id} />

              <Card title="Activity trail" hint="Derived from records that exist — there is no audit log yet">
                <AsyncSection
                  state={activityQuery.state}
                  reload={activityQuery.reload}
                  isEmpty={(rows) => rows.length === 0}
                  empty={<EmptyState title="Nothing recorded yet" />}
                  loadingRows={4}
                >
                  {(rows) => (
                    <ul className={s.trail}>
                      {rows.slice(0, 25).map((entry, i) => (
                        <li key={i}>
                          <span className={s.trailDate}>{formatDate(entry.on)}</span>
                          <span>
                            <strong>{entry.title}</strong>
                            <br />
                            <Muted>
                              <Small>{entry.detail}</Small>
                            </Muted>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </AsyncSection>
              </Card>
            </Stack>
          </>
        );
      }}
    </AsyncSection>
  );
}

function ManagerName({ id }: { id: string }) {
  const { state } = useAsync(() => getEmployee(id), [id]);
  if (state.status !== 'ready' || !state.data) return <>…</>;
  return <>{state.data.fullName}</>;
}
