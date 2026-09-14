import type { CurrentUser } from '@/lib/auth';
import type {
  ApprovalStep,
  ApproverRole,
  AttendancePolicy,
  Delegation,
  Employee,
  Entity,
  HolidayCalendar,
  LeavePolicy,
  PolicyGroup,
  WeekOffPattern,
} from '@/lib/types';
import { MOCK_TODAY } from '@/lib/clock';
import { approverRoleLabels } from '@/lib/labels';
import { read, store } from './store';

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export async function listEntities(): Promise<Entity[]> {
  return read(() => [...store.entities].sort((a, b) => a.shortName.localeCompare(b.shortName)));
}

export function findEntitySync(id: string | null | undefined): Entity | null {
  if (!id) return null;
  return store.entities.find((e) => e.id === id) ?? null;
}

/** Reports default to the viewer's own entity. */
export function defaultEntityFor(user: CurrentUser): string {
  return user.employee.entityId;
}

// ---------------------------------------------------------------------------
// Policy groups and the rules they carry
// ---------------------------------------------------------------------------

export function findPolicyGroupSync(id: string | null | undefined): PolicyGroup | null {
  if (!id) return null;
  return store.policyGroups.find((g) => g.id === id) ?? null;
}

export async function listPolicyGroups(entityId?: string): Promise<PolicyGroup[]> {
  return read(() =>
    store.policyGroups
      .filter((g) => (entityId ? g.entityId === entityId : true))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
}

export interface ResolvedRules {
  employee: Employee;
  entity: Entity | null;
  group: PolicyGroup | null;
  leavePolicy: LeavePolicy | null;
  attendancePolicy: AttendancePolicy | null;
  holidayCalendar: HolidayCalendar | null;
  weekOff: WeekOffPattern | null;
  shiftName: string | null;
  /** Plain-English lines, because people argue about leave rules constantly. */
  plainEnglish: string[];
}

/**
 * Everything that governs one person's working life, resolved from data.
 *
 * Nothing here is computed from a hardcoded rule: an HR admin changing an
 * accrual rate edits a record. If a rule ever needs a code change to express,
 * that is a design failure and should be flagged rather than worked around.
 */
export async function getRulesFor(employeeId: string): Promise<ResolvedRules | null> {
  return read(() => {
    const employee = store.employees.find((e) => e.id === employeeId);
    if (!employee) return null;

    const entity = store.entities.find((e) => e.id === employee.entityId) ?? null;
    const group = store.policyGroups.find((g) => g.id === employee.policyGroupId) ?? null;
    const leavePolicy = group ? (store.leavePolicies.find((p) => p.id === group.leavePolicyId) ?? null) : null;
    const attendancePolicy = group
      ? (store.attendancePolicies.find((p) => p.id === group.attendancePolicyId) ?? null)
      : null;
    const holidayCalendar = group
      ? (store.holidayCalendars.find((c) => c.id === group.holidayCalendarId) ?? null)
      : null;
    const weekOff = group ? (store.weekOffPatterns.find((w) => w.id === group.weekOffPatternId) ?? null) : null;
    const shift = attendancePolicy ? store.shifts.find((s) => s.id === attendancePolicy.shiftId) : undefined;

    const plainEnglish: string[] = [];
    if (entity) plainEnglish.push(`You are employed by ${entity.legalName}.`);
    if (group) plainEnglish.push(`Your working rules come from the "${group.name}" group.`);
    if (shift && attendancePolicy) {
      plainEnglish.push(
        `Your shift is ${shift.name}, ${shift.startTime} to ${shift.endTime}, ${shift.expectedHours} hours expected.`,
      );
      plainEnglish.push(
        attendancePolicy.graceMinutes > 0
          ? `You are counted late after ${attendancePolicy.graceMinutes} minutes past ${shift.startTime}.`
          : 'There is no grace period on your start time.',
      );
      plainEnglish.push(
        `Under ${attendancePolicy.halfDayThresholdHours} hours in a day is recorded as a half day.`,
      );
      if (attendancePolicy.lateMarksBeforeDeduction > 0) {
        plainEnglish.push(
          `After ${attendancePolicy.lateMarksBeforeDeduction} late marks in a month, ${attendancePolicy.lateDeductionDays} day is deducted from your casual leave.`,
        );
      } else {
        plainEnglish.push('Late marks do not carry a leave deduction for your group.');
      }
    }
    if (weekOff) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const base = weekOff.days.map((d) => dayNames[d]).join(' and ');
      plainEnglish.push(
        weekOff.alternateSaturdays.length > 0
          ? `Your week off is ${base}, plus the ${weekOff.alternateSaturdays.map(ordinal).join(' and ')} Saturday of each month.`
          : `Your week off is ${base}.`,
      );
    }
    if (holidayCalendar) plainEnglish.push(`You follow the "${holidayCalendar.name}" holiday calendar.`);

    return { employee, entity, group, leavePolicy, attendancePolicy, holidayCalendar, weekOff, shiftName: shift?.name ?? null, plainEnglish };
  });
}

function ordinal(n: number): string {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}

// ---------------------------------------------------------------------------
// Approval chains
// ---------------------------------------------------------------------------

/** Who fills an approver role for a given person, right now. */
export function resolveApprover(role: ApproverRole, employee: Employee): Employee | null {
  const byId = (id: string | null) => (id ? (store.employees.find((e) => e.id === id) ?? null) : null);

  switch (role) {
    case 'reporting-manager':
      return byId(employee.managerId);
    case 'skip-level-manager': {
      const manager = byId(employee.managerId);
      return manager ? byId(manager.managerId) : null;
    }
    case 'department-head': {
      // The person in this department whose own manager sits outside it.
      const inDept = store.employees.filter(
        (e) => e.department === employee.department && e.status !== 'inactive',
      );
      return (
        inDept.find((e) => {
          const m = byId(e.managerId);
          return !m || m.department !== employee.department;
        }) ?? null
      );
    }
    case 'entity-head': {
      const inEntity = store.employees.filter(
        (e) => e.entityId === employee.entityId && e.status !== 'inactive',
      );
      // The top of the tree inside that entity; otherwise the longest-serving.
      return (
        inEntity.find((e) => e.managerId === null) ??
        [...inEntity].sort((a, b) => a.joiningDate.localeCompare(b.joiningDate))[0] ??
        null
      );
    }
    case 'hr':
      return store.employees.find((e) => e.department === 'Human Resources' && e.designation.includes('Manager')) ?? null;
    case 'finance':
      return store.employees.find((e) => e.department === 'Finance' && e.designation.includes('Controller')) ?? null;
    default:
      return null;
  }
}

export interface ResolvedStep {
  step: ApprovalStep;
  roleLabel: string;
  /** Who the role resolves to. */
  approver: Employee | null;
  /** Who will actually act, if the approver has delegated. */
  actingFor: Employee | null;
  delegation: Delegation | null;
  /** False when a condition means this step will be skipped for this request. */
  applies: boolean;
  conditionText: string | null;
}

export interface ResolvedChain {
  chainId: string;
  chainName: string;
  steps: ResolvedStep[];
}

function pickChain(requestType: string, employee: Employee) {
  const forType = store.approvalChains.filter((c) => c.requestType === requestType);
  return (
    forType.find((c) => c.policyGroupId === employee.policyGroupId) ??
    forType.find((c) => c.entityId === employee.entityId) ??
    forType.find((c) => c.policyGroupId === null && c.entityId === null) ??
    null
  );
}

/** An approver's authority, handed over for a dated period. */
export function activeDelegationFrom(employeeId: string, on: string = MOCK_TODAY): Delegation | null {
  return (
    store.delegations.find(
      (d) => d.fromEmployeeId === employeeId && d.validFrom <= on && d.validTo >= on,
    ) ?? null
  );
}

/**
 * The chain a request will follow, with every role resolved to a person.
 *
 * `payload` is optional: without it every conditional step is shown as
 * conditional, which is what the read-only viewer wants. With it, conditions
 * are evaluated so the caller can see the chain this particular request takes.
 */
export async function resolveChain(
  requestType: string,
  employeeId: string,
  payload?: Record<string, unknown>,
): Promise<ResolvedChain | null> {
  return read(() => {
    const employee = store.employees.find((e) => e.id === employeeId);
    if (!employee) return null;
    const chain = pickChain(requestType, employee);
    if (!chain) return null;

    const steps = store.approvalSteps
      .filter((s) => s.chainId === chain.id)
      .sort((a, b) => a.position - b.position)
      .map((step): ResolvedStep => {
        const approver = resolveApprover(step.approverRole, employee);
        const delegation = approver ? activeDelegationFrom(approver.id) : null;
        const actingFor = delegation
          ? (store.employees.find((e) => e.id === delegation.toEmployeeId) ?? null)
          : null;

        let applies = true;
        if (step.condition) {
          if (!payload) {
            applies = true;
          } else {
            const raw = payload[step.condition.field];
            const value = typeof raw === 'number' ? raw : Number(raw);
            const target = Number(step.condition.value);
            applies = Number.isNaN(value)
              ? false
              : step.condition.operator === 'gt'
                ? value > target
                : step.condition.operator === 'gte'
                  ? value >= target
                  : step.condition.operator === 'lt'
                    ? value < target
                    : step.condition.operator === 'lte'
                      ? value <= target
                      : value === target;
          }
        }

        return {
          step,
          roleLabel: approverRoleLabels[step.approverRole],
          approver,
          actingFor,
          delegation,
          applies,
          conditionText: step.condition ? step.condition.describe : null,
        };
      });

    return { chainId: chain.id, chainName: chain.name, steps };
  });
}

export async function listDelegations(): Promise<Delegation[]> {
  return read(() => [...store.delegations].sort((a, b) => b.validFrom.localeCompare(a.validFrom)));
}
