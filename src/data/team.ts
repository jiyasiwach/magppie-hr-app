import type { CurrentUser } from '@/lib/auth';
import type { Employee, Shift } from '@/lib/types';
import { MOCK_TODAY } from '@/lib/clock';
import { addDays, dayOfWeek, datesBetween } from '@/lib/date';
import { reportingLine, visibleEmployeeIds } from '@/lib/permissions';
import { shiftIdForLocation } from '@/mocks/calendar';
import { read, store } from './store';

/** Monday to Sunday around the pinned today. */
export function currentWeek(): { start: string; end: string } {
  const dow = dayOfWeek(MOCK_TODAY); // 0 = Sunday
  const backToMonday = dow === 0 ? 6 : dow - 1;
  const start = addDays(MOCK_TODAY, -backToMonday);
  return { start, end: addDays(start, 6) };
}

export function shiftFor(employee: Employee): Shift {
  const id = shiftIdForLocation(employee.location, employee.department);
  return store.shifts.find((s) => s.id === id) ?? store.shifts[0];
}

export async function getShift(employeeId: string): Promise<Shift | null> {
  return read(() => {
    const employee = store.employees.find((e) => e.id === employeeId);
    return employee ? shiftFor(employee) : null;
  });
}

// ---------------------------------------------------------------------------
// Off this week
// ---------------------------------------------------------------------------

export interface AwayEntry {
  employee: Employee;
  dates: string[];
  leaveTypeName: string;
  pending: boolean;
}

/**
 * FLAGGED: "away" is taken to mean approved or pending leave overlapping this
 * week. Whether work-from-home should count as away has not been stated — it
 * does not here, because the person is working.
 */
export async function getAwayThisWeek(scopeIds: string[]): Promise<AwayEntry[]> {
  return read(() => {
    const { start, end } = currentWeek();
    return store.leaveRequests
      .filter(
        (r) =>
          scopeIds.includes(r.employeeId) &&
          (r.status === 'approved' || r.status === 'pending') &&
          r.endDate >= start &&
          r.startDate <= end,
      )
      .map((r) => {
        const employee = store.employees.find((e) => e.id === r.employeeId);
        return {
          employee: employee!,
          dates: datesBetween(r.startDate, r.endDate).filter((d) => d >= start && d <= end),
          leaveTypeName: store.leaveTypes.find((t) => t.id === r.leaveTypeId)?.name ?? 'Leave',
          pending: r.status === 'pending',
        };
      })
      .filter((entry) => entry.employee)
      .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName));
  });
}

// ---------------------------------------------------------------------------
// Teammates and the four filter chips
// ---------------------------------------------------------------------------

export type TeamFilter = 'all' | 'not-in' | 'on-time' | 'remote';

export interface TeammateRow {
  employee: Employee;
  shift: Shift;
  firstIn: string | null;
  /** Approved work-from-home covering today. */
  remote: boolean;
  onLeave: boolean;
  state: 'not-in' | 'on-time' | 'late' | 'remote' | 'away';
}

/**
 * FLAGGED: "on time" needs a shift start, and shift assignment is derived from
 * location because no roster exists. "Remote" is read from an approved
 * work-from-home request covering today. Both are stand-ins for real rules.
 */
export async function getTeammates(user: CurrentUser): Promise<TeammateRow[]> {
  return read(() => {
    // Section 10 says this screen is visible to everyone showing their own
    // department, so the list is the person's department plus, for a manager,
    // their whole reporting line. Yourself is not your own teammate.
    //
    // FLAGGED: this shows a colleague's punch state to someone who does not
    // manage them. That is what the four filter chips require, but nobody has
    // confirmed it is the intended privacy rule.
    const ids = new Set([
      ...visibleEmployeeIds(user),
      ...store.employees
        .filter((e) => e.department === user.employee.department)
        .map((e) => e.id),
    ]);
    ids.delete(user.employee.id);
    const wfhToday = new Set(
      store.requests
        .filter(
          (r) =>
            r.type === 'wfh' &&
            r.status === 'approved' &&
            String(r.payload.startDate) <= MOCK_TODAY &&
            String(r.payload.endDate) >= MOCK_TODAY,
        )
        .map((r) => r.raisedBy),
    );

    return store.employees
      .filter((e) => ids.has(e.id) && e.status !== 'inactive')
      .map((employee) => {
        const shift = shiftFor(employee);
        const day = store.attendanceDays.find(
          (d) => d.employeeId === employee.id && d.date === MOCK_TODAY,
        );
        const onLeave = day?.status === 'leave';
        const remote = wfhToday.has(employee.id);
        const firstIn = day?.firstIn ?? null;

        let state: TeammateRow['state'];
        if (onLeave) state = 'away';
        else if (remote) state = 'remote';
        else if (!firstIn) state = 'not-in';
        else state = firstIn.slice(11, 16) <= shift.startTime ? 'on-time' : 'late';

        return { employee, shift, firstIn, remote, onLeave, state };
      })
      .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName));
  });
}

export function countsFor(rows: TeammateRow[]): Record<TeamFilter, number> {
  return {
    all: rows.length,
    'not-in': rows.filter((r) => r.state === 'not-in').length,
    'on-time': rows.filter((r) => r.state === 'on-time').length,
    remote: rows.filter((r) => r.state === 'remote').length,
  };
}

export function applyTeamFilter(rows: TeammateRow[], filter: TeamFilter): TeammateRow[] {
  if (filter === 'all') return rows;
  return rows.filter((r) => r.state === filter);
}

// ---------------------------------------------------------------------------
// Department summary
// ---------------------------------------------------------------------------

export interface DepartmentSummary {
  department: string;
  headcount: number;
  recentJoiners: number;
  /** Whether this is the current user's own department. */
  own: boolean;
}

const RECENT_JOINER_DAYS = 90;

export async function getDepartments(user: CurrentUser): Promise<DepartmentSummary[]> {
  return read(() => {
    const cutoff = addDays(MOCK_TODAY, -RECENT_JOINER_DAYS);
    const inScope =
      user.role === 'hr-admin'
        ? store.employees
        : store.employees.filter(
            (e) => e.department === user.employee.department || reportingLine(user.employee.id).includes(e.id),
          );

    const byDepartment = new Map<string, Employee[]>();
    inScope
      .filter((e) => e.status !== 'inactive')
      .forEach((e) => {
        byDepartment.set(e.department, [...(byDepartment.get(e.department) ?? []), e]);
      });

    return [...byDepartment.entries()]
      .map(([department, people]) => ({
        department,
        headcount: people.length,
        recentJoiners: people.filter((p) => p.joiningDate >= cutoff).length,
        own: department === user.employee.department,
      }))
      .sort((a, b) => Number(b.own) - Number(a.own) || a.department.localeCompare(b.department));
  });
}

// ---------------------------------------------------------------------------
// Colleague search — the field in the top bar
// ---------------------------------------------------------------------------

export async function searchColleagues(query: string, limit = 8): Promise<Employee[]> {
  return read(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return store.employees
      .filter((e) =>
        [e.fullName, e.employeeCode, e.designation, e.department, e.workEmail]
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .slice(0, limit);
  });
}
