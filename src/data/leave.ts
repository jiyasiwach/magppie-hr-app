import type { LeaveRequest, LeaveTransaction, LeaveType } from '@/lib/types';
import { MOCK_TODAY } from '@/lib/clock';
import { datesBetween, inclusiveDayCount } from '@/lib/date';
import { read, store, write } from './store';

export interface LeaveBalance {
  leaveType: LeaveType;
  balance: number;
  credited: number;
  debited: number;
  adjusted: number;
  /** Every movement that produced the balance, oldest first, with running total. */
  breakdown: Array<LeaveTransaction & { runningBalance: number }>;
  /** Approved-but-not-yet-taken and still-pending days, shown separately. */
  pendingDays: number;
}

export async function getLeaveBalances(employeeId: string): Promise<LeaveBalance[]> {
  return read(() =>
    store.leaveTypes.map((leaveType) => {
      const transactions = store.leaveTransactions
        .filter((t) => t.employeeId === employeeId && t.leaveTypeId === leaveType.id)
        .sort((a, b) => a.date.localeCompare(b.date));

      let running = 0;
      const breakdown = transactions.map((t) => {
        running += t.direction === 'debit' ? -t.amount : t.amount;
        return { ...t, runningBalance: Math.round(running * 100) / 100 };
      });

      const sum = (dir: LeaveTransaction['direction']) =>
        Math.round(
          transactions.filter((t) => t.direction === dir).reduce((s, t) => s + t.amount, 0) * 100,
        ) / 100;

      const pendingDays = store.leaveRequests
        .filter((r) => r.employeeId === employeeId && r.leaveTypeId === leaveType.id && r.status === 'pending')
        .reduce((s, r) => s + leaveDays(r), 0);

      return {
        leaveType,
        balance: Math.round(running * 100) / 100,
        credited: sum('credit'),
        debited: sum('debit'),
        adjusted: sum('adjustment'),
        breakdown,
        pendingDays,
      };
    }),
  );
}

export function leaveDays(request: Pick<LeaveRequest, 'startDate' | 'endDate' | 'halfDayStart' | 'halfDayEnd'>): number {
  const whole = inclusiveDayCount(request.startDate, request.endDate);
  return whole - (request.halfDayStart ? 0.5 : 0) - (request.halfDayEnd ? 0.5 : 0);
}

export async function getLeaveTypes(): Promise<LeaveType[]> {
  return read(() => store.leaveTypes);
}

export async function getLeaveRequests(employeeId: string): Promise<LeaveRequest[]> {
  return read(() =>
    store.leaveRequests
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => b.startDate.localeCompare(a.startDate)),
  );
}

export async function submitLeaveRequest(input: {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  halfDayStart: boolean;
  halfDayEnd: boolean;
  reason: string;
}): Promise<void> {
  await write(() => {
    const id = `lr-${input.employeeId}-${Date.now()}`;
    store.leaveRequests.unshift({ id, ...input, status: 'pending' });
    const employee = store.employees.find((e) => e.id === input.employeeId);
    store.requests.unshift({
      id: `req-${id}`,
      type: 'leave',
      raisedBy: input.employeeId,
      raisedOn: new Date().toISOString(),
      currentApprover: employee?.managerId ?? 'emp-005',
      status: 'pending',
      payload: {
        leaveRequestId: id,
        leaveTypeId: input.leaveTypeId,
        startDate: input.startDate,
        endDate: input.endDate,
        days: leaveDays(input),
        halfDayStart: input.halfDayStart,
        halfDayEnd: input.halfDayEnd,
        reason: input.reason,
      },
      decisionComments: [],
    });
  });
}

/** Records are never deleted. A withdrawn request is cancelled. */
export async function cancelLeaveRequest(leaveRequestId: string): Promise<void> {
  await write(() => {
    const request = store.leaveRequests.find((r) => r.id === leaveRequestId);
    if (request) request.status = 'cancelled';
    const generic = store.requests.find((r) => r.payload.leaveRequestId === leaveRequestId);
    if (generic) {
      generic.status = 'cancelled';
      generic.currentApprover = null;
    }
  });
}

export interface TeamLeaveEntry {
  employeeId: string;
  date: string;
  leaveTypeId: string;
  status: LeaveRequest['status'];
  half: boolean;
}

/** Who is off when, across a date range — approved and pending both shown. */
export async function getTeamLeave(
  employeeIds: string[],
  startDate: string,
  endDate: string,
): Promise<TeamLeaveEntry[]> {
  return read(() => {
    const out: TeamLeaveEntry[] = [];
    store.leaveRequests
      .filter(
        (r) =>
          employeeIds.includes(r.employeeId) &&
          (r.status === 'approved' || r.status === 'pending') &&
          r.endDate >= startDate &&
          r.startDate <= endDate,
      )
      .forEach((r) => {
        datesBetween(r.startDate, r.endDate)
          .filter((d) => d >= startDate && d <= endDate)
          .forEach((date) => {
            out.push({
              employeeId: r.employeeId,
              date,
              leaveTypeId: r.leaveTypeId,
              status: r.status,
              half: (date === r.startDate && r.halfDayStart) || (date === r.endDate && r.halfDayEnd),
            });
          });
      });
    return out;
  });
}

export async function getUpcomingLeave(employeeId: string): Promise<LeaveRequest[]> {
  return read(() =>
    store.leaveRequests
      .filter((r) => r.employeeId === employeeId && r.endDate >= MOCK_TODAY && r.status !== 'cancelled' && r.status !== 'rejected')
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
  );
}
