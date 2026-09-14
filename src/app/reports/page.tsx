'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AsyncSection,
  Button,
  Card,
  EmptyState,
  Grid,
  Metric,
  PageHeader,
  Small,
  Stack,
  StatusPill,
} from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import {
  downloadCsv,
  getAttendanceReport,
  getHeadcount,
  getLeaveReport,
  getRequestsReport,
  getTenureReport,
  toCsv,
  MIN_GROUP,
  type Cell,
} from '@/data/reports';
import { useAsync } from '@/hooks/useAsync';
import { MOCK_TODAY } from '@/lib/clock';
import { formatMonth } from '@/lib/date';
import { employmentTypeLabels, requestTypeLabels } from '@/lib/labels';
import { canSeeApprovals } from '@/lib/permissions';
import { entities } from '@/mocks';
import s from './reports.module.css';

export default function ReportsPage() {
  const { user } = useCurrentUser();
  const [entityId, setEntityId] = useState<string>(user.employee.entityId);
  const month = MOCK_TODAY.slice(0, 7);
  const allowed = canSeeApprovals(user);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Counts and trends across the workforce. No individual scoring, no rankings — and no number small enough to identify a person."
      />

      <Stack>
        <Card>
          <div className={s.filters}>
            <div className={s.field}>
              <label className={s.label} htmlFor="rep-entity">
                Entity
              </label>
              <select id="rep-entity" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.shortName} — {e.legalName}
                  </option>
                ))}
                <option value="all">All entities</option>
              </select>
            </div>
            <p className={s.note}>
              <Small>
                Defaults to your own entity.{' '}
                {user.role === 'hr-admin'
                  ? 'You see the whole organisation.'
                  : 'You see only your reporting line, whichever entity is selected.'}
              </Small>
            </p>
          </div>
        </Card>

        {allowed ? (
          <>
            <Headcount entityId={entityId} />
            <Attendance entityId={entityId} month={month} />
            <Leave entityId={entityId} />
            <Requests entityId={entityId} />
            <Tenure entityId={entityId} />
          </>
        ) : (
          <Card>
            <EmptyState
              title="Reports are for managers and HR"
              body="Your own attendance and leave, with all the working shown, are under Me."
            />
          </Card>
        )}

        <Card title="How these numbers behave">
          <ul className={s.rules}>
            <li>
              A figure covering fewer than {MIN_GROUP} people is not shown. A small group makes an
              average into one person&rsquo;s record.
            </li>
            <li>Every report covers only the people you are allowed to see.</li>
            <li>No employee is scored, ranked or compared against another anywhere in this app.</li>
            <li>Every number links through to the records behind it, and exports as it appears.</li>
          </ul>
        </Card>
      </Stack>
    </>
  );
}

function Suppressible({ cell }: { cell: Cell }) {
  if (cell.suppressed) {
    return (
      <li className={s.row}>
        <span>{cell.label}</span>
        <StatusPill label={`Fewer than ${MIN_GROUP}`} tone="quiet" />
      </li>
    );
  }
  return (
    <li className={s.row}>
      <span>{cell.href ? <Link href={cell.href}>{cell.label}</Link> : cell.label}</span>
      <strong>{cell.value}</strong>
    </li>
  );
}

function Headcount({ entityId }: { entityId: string }) {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getHeadcount(user, entityId), [user.employee.id, entityId]);

  return (
    <Card title="Headcount">
      <AsyncSection state={state} reload={reload} loadingRows={4}>
        {(r) => (
          <>
            <Grid>
              <Metric value={r.total} label={`Active people · ${r.scope.entityLabel}`} />
              <Metric
                value={r.joinersByMonth.slice(-3).reduce((s2, m) => s2 + m.count, 0)}
                label="Joined in the last 3 months"
              />
              <Metric
                value={r.leaversByMonth.reduce((s2, m) => s2 + m.count, 0)}
                label="Left in the last 12 months"
              />
            </Grid>

            <div className={s.split}>
              <div>
                <h3 className={s.subhead}>By department</h3>
                <ul className={s.list}>
                  {r.byDepartment.map((c) => (
                    <Suppressible key={c.label} cell={c} />
                  ))}
                </ul>
              </div>
              <div>
                <h3 className={s.subhead}>By entity</h3>
                <ul className={s.list}>
                  {r.byEntity.map((c) => (
                    <Suppressible key={c.label} cell={c} />
                  ))}
                </ul>
                <h3 className={s.subhead}>By employment type</h3>
                <ul className={s.list}>
                  {r.byEmploymentType.map((c) => (
                    <Suppressible
                      key={c.label}
                      cell={{ ...c, label: employmentTypeLabels[c.label as keyof typeof employmentTypeLabels] ?? c.label }}
                    />
                  ))}
                </ul>
              </div>
            </div>

            <Button
              variant="quiet"
              onClick={() =>
                downloadCsv(
                  `headcount-${r.scope.entityLabel}.csv`,
                  toCsv(
                    `Headcount — ${r.scope.entityLabel}`,
                    r.byDepartment.map((c) => ({
                      department: c.label,
                      headcount: c.suppressed ? 'suppressed' : c.value,
                    })),
                  ),
                )
              }
            >
              Export headcount
            </Button>
          </>
        )}
      </AsyncSection>
    </Card>
  );
}

function Attendance({ entityId, month }: { entityId: string; month: string }) {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(
    () => getAttendanceReport(user, entityId, month),
    [user.employee.id, entityId, month],
  );

  return (
    <Card title={`Attendance — ${formatMonth(month)}`}>
      <AsyncSection state={state} reload={reload} loadingRows={3}>
        {(r) =>
          r.suppressed ? (
            <EmptyState
              title="Too few people to report on"
              body={`This scope covers fewer than ${MIN_GROUP} people, so an attendance summary would describe individuals rather than a group.`}
            />
          ) : (
            <>
              <Grid>
                <Metric value={r.present} label="Present days" />
                <Metric value={r.onLeave} label="Days on leave" />
                <Metric value={r.absent} label="Absent days" />
                <Metric value={r.lateArrivals} label="Late arrivals (after grace)" />
                <Metric value={r.halfDay} label="Half days" />
                <Metric value={r.pendingRegularisation} label="Days awaiting regularisation" />
                <Metric value={r.averageHours ?? '—'} label="Average hours on a worked day" />
                <Metric value={r.regularisationsRaised} label="Regularisations raised" />
              </Grid>
              <p className={s.note}>
                <Small>
                  Late is measured against each person&rsquo;s own shift start plus their group&rsquo;s
                  grace period, not a single company time.
                </Small>
              </p>
            </>
          )
        }
      </AsyncSection>
    </Card>
  );
}

function Leave({ entityId }: { entityId: string }) {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getLeaveReport(user, entityId), [user.employee.id, entityId]);

  return (
    <Card title="Leave">
      <AsyncSection state={state} reload={reload} loadingRows={3}>
        {(r) =>
          r.suppressed ? (
            <EmptyState title="Too few people to report on" body="A leave summary over this group would identify individuals." />
          ) : (
            <>
              <Grid>
                <Metric
                  value={r.totalOutstandingDays}
                  label="Unused balance carried, in days"
                  note={
                    <Small>
                      <span className={s.muted}>The figure finance asks for.</span>
                    </Small>
                  }
                />
                <Metric
                  value={r.takenByMonth.slice(-1)[0]?.days ?? 0}
                  label="Days taken this month"
                />
              </Grid>

              <div className={s.split}>
                <div>
                  <h3 className={s.subhead}>Outstanding by type</h3>
                  <ul className={s.list}>
                    {r.outstandingByType.map((c) => (
                      <Suppressible key={c.label} cell={c} />
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className={s.subhead}>Taken by type</h3>
                  <ul className={s.list}>
                    {r.takenByType.map((c) => (
                      <Suppressible key={c.label} cell={c} />
                    ))}
                  </ul>
                </div>
              </div>

              <Button
                variant="quiet"
                onClick={() =>
                  downloadCsv(
                    'leave-outstanding.csv',
                    toCsv(
                      `Leave outstanding — ${r.scope.entityLabel}`,
                      r.outstandingByType.map((c) => ({
                        leaveType: c.label,
                        days: c.suppressed ? 'suppressed' : c.value,
                      })),
                    ),
                  )
                }
              >
                Export leave liability
              </Button>
            </>
          )
        }
      </AsyncSection>
    </Card>
  );
}

function Requests({ entityId }: { entityId: string }) {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getRequestsReport(user, entityId), [user.employee.id, entityId]);

  return (
    <Card title="Requests and approvals">
      <AsyncSection state={state} reload={reload} loadingRows={3}>
        {(r) => (
          <>
            <Grid>
              <Metric value={r.pending} label="Pending right now" />
              <Metric value={r.averageDaysToDecision ?? '—'} label="Average days to a decision" />
            </Grid>

            <div className={s.split}>
              <div>
                <h3 className={s.subhead}>By type</h3>
                <ul className={s.list}>
                  {r.byType.map((c) => (
                    <Suppressible
                      key={c.label}
                      cell={{ ...c, label: requestTypeLabels[c.label as keyof typeof requestTypeLabels] ?? c.label }}
                    />
                  ))}
                </ul>
              </div>
              <div>
                <h3 className={s.subhead}>Sitting unactioned</h3>
                {r.unactioned.length === 0 ? (
                  <p className={s.muted}>
                    <Small>Nothing is waiting on anyone.</Small>
                  </p>
                ) : (
                  <ul className={s.list}>
                    {r.unactioned.map((u) => (
                      <li key={u.approverName} className={s.row}>
                        <span>{u.approverName}</span>
                        <span>
                          {u.count} · oldest {u.oldestDays}d
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className={s.muted}>
                  <Small>
                    This is a queue length, not a performance measure. It exists so work does not sit
                    invisibly.
                  </Small>
                </p>
              </div>
            </div>
          </>
        )}
      </AsyncSection>
    </Card>
  );
}

function Tenure({ entityId }: { entityId: string }) {
  const { user } = useCurrentUser();
  const { state, reload } = useAsync(() => getTenureReport(user, entityId), [user.employee.id, entityId]);

  return (
    <Card title="Tenure and attrition">
      <AsyncSection state={state} reload={reload} loadingRows={2}>
        {(r) =>
          r.suppressed ? (
            <EmptyState title="Too few people to report on" body="Tenure over this group would describe individuals." />
          ) : (
            <Grid>
              <Metric value={r.averageTenureYears ?? '—'} label="Average tenure, years" />
              <Metric
                value={r.exitsByMonth.reduce((s2, m) => s2 + m.count, 0)}
                label="Exits in the last 12 months"
              />
              <Metric value={r.exitsWithinProbation} label="Exits within probation" />
            </Grid>
          )
        }
      </AsyncSection>
    </Card>
  );
}
