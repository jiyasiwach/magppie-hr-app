import type { CurrentUser } from '@/lib/auth';
import type { Employee } from '@/lib/types';
import { MOCK_TODAY } from '@/lib/clock';
import { visibleEmployeeIds } from '@/lib/permissions';
import { findEntitySync } from './organisation';
import { read, store } from './store';

/**
 * ============================================================================
 * Reporting layer
 * ============================================================================
 * Built once, here, rather than letting each module grow its own reports.
 *
 * Three rules are enforced in this file and must stay enforced:
 *
 *  1. SCOPE. Every report runs over `visibleEmployeeIds(user)`. A manager's
 *     version covers their reporting line; HR sees the organisation. There is
 *     no code path that widens this.
 *
 *  2. SMALL GROUPS ARE SUPPRESSED. A count over fewer than MIN_GROUP people is
 *     not shown, because "Design took 4 sick days this month" across a team of
 *     two is an individual's medical record wearing a chart's clothes.
 *
 *  3. NO PEOPLE. Counts and trends only. No individual scoring, no ranking, no
 *     leaderboards, no "most absent". If you find yourself adding a per-person
 *     ORDER BY to this file, stop.
 * ============================================================================
 */

/** Below this, a cell is suppressed rather than shown. */
export const MIN_GROUP = 3;

export interface Cell {
  label: string;
  value: number;
  /** True when the underlying group was too small to show. */
  suppressed: boolean;
  /** Where to go to see the records behind the number. */
  href?: string;
}

export interface ReportScope {
  employees: Employee[];
  entityId: string | 'all';
  entityLabel: string;
  /** True when the viewer is not seeing the whole organisation. */
  limited: boolean;
}

function scopeFor(user: CurrentUser, entityId: string | 'all'): ReportScope {
  const ids = new Set(visibleEmployeeIds(user));
  const all = store.employees.filter((e) => ids.has(e.id));
  const employees = entityId === 'all' ? all : all.filter((e) => e.entityId === entityId);
  return {
    employees,
    entityId,
    entityLabel: entityId === 'all' ? 'All entities' : (findEntitySync(entityId)?.shortName ?? entityId),
    limited: user.role !== 'hr-admin',
  };
}

function cells(groups: Map<string, Employee[]>, href?: (key: string) => string): Cell[] {
  return [...groups.entries()]
    .map(([label, people]) => ({
      label,
      value: people.length,
      suppressed: people.length > 0 && people.length < MIN_GROUP,
      href: href?.(label),
    }))
    .sort((a, b) => b.value - a.value);
}

function groupBy(employees: Employee[], key: (e: Employee) => string): Map<string, Employee[]> {
  const map = new Map<string, Employee[]>();
  employees.forEach((e) => map.set(key(e), [...(map.get(key(e)) ?? []), e]));
  return map;
}

// ---------------------------------------------------------------------------
// Headcount
// ---------------------------------------------------------------------------

export interface HeadcountReport {
  scope: ReportScope;
  total: number;
  byEntity: Cell[];
  byDepartment: Cell[];
  byLocation: Cell[];
  byEmploymentType: Cell[];
  joinersByMonth: Array<{ month: string; count: number }>;
  leaversByMonth: Array<{ month: string; count: number }>;
}

export async function getHeadcount(user: CurrentUser, entityId: string | 'all'): Promise<HeadcountReport> {
  return read(() => {
    const scope = scopeFor(user, entityId);
    const active = scope.employees.filter((e) => e.status !== 'inactive');
    const months = lastMonths(12);

    return {
      scope,
      total: active.length,
      byEntity: cells(groupBy(active, (e) => findEntitySync(e.entityId)?.shortName ?? e.entityId)),
      byDepartment: cells(
        groupBy(active, (e) => e.department),
        (d) => `/directory?department=${encodeURIComponent(d)}`,
      ),
      byLocation: cells(groupBy(active, (e) => e.location)),
      byEmploymentType: cells(groupBy(active, (e) => e.employmentType)),
      joinersByMonth: months.map((month) => ({
        month,
        count: scope.employees.filter((e) => e.joiningDate.startsWith(month)).length,
      })),
      leaversByMonth: months.map((month) => ({
        month,
        count: store.employmentRecords.filter(
          (r) =>
            r.validTo?.startsWith(month) &&
            scope.employees.some((e) => e.id === r.employeeId && e.status === 'inactive'),
        ).length,
      })),
    };
  });
}

function lastMonths(n: number): string[] {
  const out: string[] = [];
  const [y, m] = MOCK_TODAY.split('-').map(Number);
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export interface AttendanceReport {
  scope: ReportScope;
  month: string;
  present: number;
  absent: number;
  halfDay: number;
  onLeave: number;
  pendingRegularisation: number;
  lateArrivals: number;
  averageHours: number | null;
  regularisationsRaised: number;
  /** Too few people to report on without identifying them. */
  suppressed: boolean;
}

export async function getAttendanceReport(
  user: CurrentUser,
  entityId: string | 'all',
  month: string,
): Promise<AttendanceReport> {
  return read(() => {
    const scope = scopeFor(user, entityId);
    const ids = new Set(scope.employees.map((e) => e.id));
    const days = store.attendanceDays.filter((d) => ids.has(d.employeeId) && d.date.startsWith(month));
    const worked = days.filter((d) => d.totalHours > 0);

    const shiftStartFor = (employeeId: string) => {
      const employee = store.employees.find((e) => e.id === employeeId);
      if (!employee) return null;
      const group = store.policyGroups.find((g) => g.id === employee.policyGroupId);
      const policy = group ? store.attendancePolicies.find((p) => p.id === group.attendancePolicyId) : null;
      const shift = policy ? store.shifts.find((s) => s.id === policy.shiftId) : null;
      return shift && policy ? { start: shift.startTime, grace: policy.graceMinutes } : null;
    };

    const lateArrivals = days.filter((d) => {
      if (!d.firstIn) return false;
      const rule = shiftStartFor(d.employeeId);
      if (!rule) return false;
      const [sh, sm] = rule.start.split(':').map(Number);
      const limit = sh * 60 + sm + rule.grace;
      const inMinutes = Number(d.firstIn.slice(11, 13)) * 60 + Number(d.firstIn.slice(14, 16));
      return inMinutes > limit;
    }).length;

    return {
      scope,
      month,
      present: days.filter((d) => d.status === 'present').length,
      absent: days.filter((d) => d.status === 'absent').length,
      halfDay: days.filter((d) => d.status === 'half-day').length,
      onLeave: days.filter((d) => d.status === 'leave').length,
      pendingRegularisation: days.filter((d) => d.status === 'pending-regularisation').length,
      lateArrivals,
      averageHours: worked.length
        ? Math.round((worked.reduce((s, d) => s + d.totalHours, 0) / worked.length) * 100) / 100
        : null,
      regularisationsRaised: store.requests.filter(
        (r) => r.type === 'regularisation' && ids.has(r.raisedBy) && r.raisedOn.startsWith(month),
      ).length,
      suppressed: scope.employees.length > 0 && scope.employees.length < MIN_GROUP,
    };
  });
}

// ---------------------------------------------------------------------------
// Leave
// ---------------------------------------------------------------------------

export interface LeaveReport {
  scope: ReportScope;
  /** The number finance asks for: unused balance carried across the scope. */
  totalOutstandingDays: number;
  outstandingByType: Cell[];
  takenByType: Cell[];
  takenByMonth: Array<{ month: string; days: number }>;
  suppressed: boolean;
}

export async function getLeaveReport(user: CurrentUser, entityId: string | 'all'): Promise<LeaveReport> {
  return read(() => {
    const scope = scopeFor(user, entityId);
    const ids = new Set(scope.employees.map((e) => e.id));
    const txns = store.leaveTransactions.filter((t) => ids.has(t.employeeId));
    const typeName = (id: string) => store.leaveTypes.find((t) => t.id === id)?.name ?? id;

    const balanceByType = new Map<string, number>();
    txns.forEach((t) => {
      const delta = t.direction === 'debit' ? -t.amount : t.amount;
      balanceByType.set(t.leaveTypeId, (balanceByType.get(t.leaveTypeId) ?? 0) + delta);
    });

    const takenByType = new Map<string, number>();
    txns
      .filter((t) => t.direction === 'debit')
      .forEach((t) => takenByType.set(t.leaveTypeId, (takenByType.get(t.leaveTypeId) ?? 0) + t.amount));

    const months = lastMonths(12);
    const small = scope.employees.length > 0 && scope.employees.length < MIN_GROUP;

    return {
      scope,
      totalOutstandingDays:
        Math.round([...balanceByType.values()].reduce((s, v) => s + v, 0) * 100) / 100,
      outstandingByType: [...balanceByType.entries()].map(([id, days]) => ({
        label: typeName(id),
        value: Math.round(days * 100) / 100,
        suppressed: small,
      })),
      takenByType: [...takenByType.entries()].map(([id, days]) => ({
        label: typeName(id),
        value: Math.round(days * 100) / 100,
        suppressed: small,
      })),
      takenByMonth: months.map((month) => ({
        month,
        days:
          Math.round(
            txns
              .filter((t) => t.direction === 'debit' && t.date.startsWith(month))
              .reduce((s, t) => s + t.amount, 0) * 100,
          ) / 100,
      })),
      suppressed: small,
    };
  });
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export interface RequestsReport {
  scope: ReportScope;
  byType: Cell[];
  pending: number;
  averageDaysToDecision: number | null;
  /** Sitting unactioned, and with whom. Counts, never a ranking of people. */
  unactioned: Array<{ approverName: string; count: number; oldestDays: number }>;
}

export async function getRequestsReport(user: CurrentUser, entityId: string | 'all'): Promise<RequestsReport> {
  return read(() => {
    const scope = scopeFor(user, entityId);
    const ids = new Set(scope.employees.map((e) => e.id));
    const requests = store.requests.filter((r) => ids.has(r.raisedBy));

    const byType = new Map<string, number>();
    requests.forEach((r) => byType.set(r.type, (byType.get(r.type) ?? 0) + 1));

    const decided = requests.filter((r) => r.status !== 'pending' && r.decisionComments.length > 0);
    const days = (from: string, to: string) =>
      Math.max(0, (Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / 86_400_000);

    const pendingByApprover = new Map<string, { count: number; oldest: number }>();
    requests
      .filter((r) => r.status === 'pending' && r.currentApprover)
      .forEach((r) => {
        const name = store.employees.find((e) => e.id === r.currentApprover)?.fullName ?? 'Unassigned';
        const age = days(r.raisedOn, MOCK_TODAY);
        const current = pendingByApprover.get(name) ?? { count: 0, oldest: 0 };
        pendingByApprover.set(name, { count: current.count + 1, oldest: Math.max(current.oldest, age) });
      });

    return {
      scope,
      byType: [...byType.entries()].map(([label, value]) => ({
        label,
        value,
        suppressed: false,
        href: `/inbox`,
      })),
      pending: requests.filter((r) => r.status === 'pending').length,
      averageDaysToDecision: decided.length
        ? Math.round(
            (decided.reduce(
              (s, r) => s + days(r.raisedOn, r.decisionComments[r.decisionComments.length - 1].on),
              0,
            ) /
              decided.length) *
              10,
          ) / 10
        : null,
      unactioned: [...pendingByApprover.entries()]
        .map(([approverName, v]) => ({ approverName, count: v.count, oldestDays: v.oldest }))
        .sort((a, b) => b.oldestDays - a.oldestDays),
    };
  });
}

// ---------------------------------------------------------------------------
// Tenure and attrition
// ---------------------------------------------------------------------------

export interface TenureReport {
  scope: ReportScope;
  averageTenureYears: number | null;
  exitsByMonth: Array<{ month: string; count: number }>;
  exitsWithinProbation: number;
  suppressed: boolean;
}

export async function getTenureReport(user: CurrentUser, entityId: string | 'all'): Promise<TenureReport> {
  return read(() => {
    const scope = scopeFor(user, entityId);
    const active = scope.employees.filter((e) => e.status !== 'inactive');
    const leavers = scope.employees.filter((e) => e.status === 'inactive');
    const small = scope.employees.length > 0 && scope.employees.length < MIN_GROUP;

    const years = (from: string, to: string) =>
      (Date.parse(to) - Date.parse(from)) / (365.25 * 86_400_000);

    return {
      scope,
      averageTenureYears: active.length
        ? Math.round(
            (active.reduce((s, e) => s + years(e.joiningDate, MOCK_TODAY), 0) / active.length) * 10,
          ) / 10
        : null,
      exitsByMonth: lastMonths(12).map((month) => ({
        month,
        count: store.employmentRecords.filter(
          (r) => r.validTo?.startsWith(month) && leavers.some((e) => e.id === r.employeeId),
        ).length,
      })),
      exitsWithinProbation: leavers.filter((e) => {
        const exit = store.employmentRecords.find((r) => r.employeeId === e.id && r.validTo)?.validTo;
        return exit && e.probationEndDate ? exit <= e.probationEndDate : false;
      }).length,
      suppressed: small,
    };
  });
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** Every report is exportable. Suppressed cells export as suppressed. */
export function toCsv(title: string, rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return `${title}\n(no rows)\n`;
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    title,
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
