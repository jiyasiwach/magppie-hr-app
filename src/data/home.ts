import type { CurrentUser } from '@/lib/auth';
import type { AttendanceDay, LeaveRequest, Notification, Punch, Request } from '@/lib/types';
import { MOCK_TODAY } from '@/lib/clock';
import { canSeeApprovals } from '@/lib/permissions';
import { read, store } from './store';

export interface HomeSummary {
  today: {
    punches: Punch[];
    day: AttendanceDay | null;
    isPunchedIn: boolean;
    holidayName: string | null;
  };
  leave: Array<{ leaveTypeId: string; name: string; balance: number }>;
  /** Things this person has to act on. */
  waitingOnMe: Request[];
  /** Things this person raised that are still open. */
  myOpenRequests: Request[];
  unacknowledgedPolicies: number;
  upcomingLeave: LeaveRequest[];
  notifications: Notification[];
}

export async function getHomeSummary(user: CurrentUser): Promise<HomeSummary> {
  return read(() => {
    const id = user.employee.id;

    const punches = store.punches
      .filter((p) => p.employeeId === id && p.timestamp.slice(0, 10) === MOCK_TODAY)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const leave = store.leaveTypes
      .map((type) => {
        const balance = store.leaveTransactions
          .filter((t) => t.employeeId === id && t.leaveTypeId === type.id)
          .reduce((sum, t) => sum + (t.direction === 'debit' ? -t.amount : t.amount), 0);
        return { leaveTypeId: type.id, name: type.name, balance: Math.round(balance * 100) / 100 };
      })
      .filter((b) => b.balance !== 0);

    const acknowledged = new Set(
      store.policyAcknowledgements.filter((a) => a.employeeId === id).map((a) => a.policyId),
    );

    return {
      today: {
        punches,
        day: store.attendanceDays.find((d) => d.employeeId === id && d.date === MOCK_TODAY) ?? null,
        isPunchedIn: punches[punches.length - 1]?.direction === 'in',
        holidayName: store.holidays.find((h) => h.date === MOCK_TODAY)?.name ?? null,
      },
      leave,
      waitingOnMe: canSeeApprovals(user)
        ? store.requests.filter(
            (r) =>
              r.status === 'pending' && (user.role === 'hr-admin' ? true : r.currentApprover === id),
          )
        : [],
      myOpenRequests: store.requests.filter((r) => r.raisedBy === id && r.status === 'pending'),
      unacknowledgedPolicies: store.policies.filter((p) => !acknowledged.has(p.id)).length,
      upcomingLeave: store.leaveRequests
        .filter((r) => r.employeeId === id && r.endDate >= MOCK_TODAY && (r.status === 'approved' || r.status === 'pending'))
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
      notifications: store.notifications
        .filter((n) => n.recipientId === id)
        .sort((a, b) => b.createdOn.localeCompare(a.createdOn))
        .slice(0, 5),
    };
  });
}
