import type { CurrentUser } from '@/lib/auth';
import type { Request, RequestStatus, RequestType } from '@/lib/types';
import { canActOnRequest, visibleEmployeeIds } from '@/lib/permissions';
import { applyEmployeeChanges, type EditableField } from './directory';
import { read, store, write } from './store';

export interface QueueFilters {
  type?: RequestType | '';
  status?: RequestStatus | '';
}

/** Everything waiting on this user, whatever module raised it. */
export async function getApprovalQueue(user: CurrentUser, filters: QueueFilters = {}): Promise<Request[]> {
  return read(() => {
    const scope = new Set(visibleEmployeeIds(user));
    return store.requests
      .filter((r) => (user.role === 'hr-admin' ? true : scope.has(r.raisedBy)))
      .filter((r) => (user.role === 'hr-admin' ? true : r.currentApprover === user.employee.id || r.status !== 'pending'))
      .filter((r) => (filters.type ? r.type === filters.type : true))
      .filter((r) => (filters.status ? r.status === filters.status : true))
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return b.raisedOn.localeCompare(a.raisedOn);
      });
  });
}

export async function getMyRequests(employeeId: string): Promise<Request[]> {
  return read(() =>
    store.requests
      .filter((r) => r.raisedBy === employeeId)
      .sort((a, b) => b.raisedOn.localeCompare(a.raisedOn)),
  );
}

export async function getPendingCount(user: CurrentUser): Promise<number> {
  return read(
    () =>
      store.requests.filter(
        (r) =>
          r.status === 'pending' &&
          (user.role === 'hr-admin' ? true : r.currentApprover === user.employee.id),
      ).length,
  );
}

export type Decision = 'approved' | 'rejected';

export async function decideRequest(
  user: CurrentUser,
  requestId: string,
  decision: Decision,
  comment: string,
): Promise<void> {
  await write(() => {
    const request = store.requests.find((r) => r.id === requestId);
    if (!request) throw new Error('Request not found');
    if (!canActOnRequest(user, request)) throw new Error('You are not the approver for this request');

    request.status = decision;
    request.currentApprover = null;
    request.decisionComments.push({
      by: user.employee.id,
      on: new Date().toISOString(),
      comment,
      decision,
    });

    if (request.type === 'leave') {
      const leaveRequestId = request.payload.leaveRequestId as string;
      const leaveRequest = store.leaveRequests.find((r) => r.id === leaveRequestId);
      if (leaveRequest) {
        leaveRequest.status = decision;
        if (decision === 'approved') {
          store.leaveTransactions.push({
            id: `lx-${leaveRequest.id}`,
            employeeId: leaveRequest.employeeId,
            leaveTypeId: leaveRequest.leaveTypeId,
            date: leaveRequest.startDate,
            amount: request.payload.days as number,
            direction: 'debit',
            reason: `Leave taken — ${leaveRequest.reason}`,
            source: 'leave-request',
          });
        }
      }
    }

    if (request.type === 'profile-change' && decision === 'approved') {
      const employee = store.employees.find((e) => e.id === request.payload.employeeId);
      const field = request.payload.field as EditableField;
      if (employee && field) {
        applyEmployeeChanges(employee, [[field, request.payload.to as string]]);
      }
    }

    if (request.type === 'regularisation' && decision === 'approved') {
      const day = store.attendanceDays.find((d) => d.id === request.payload.attendanceDayId);
      if (day) {
        day.status = request.payload.requestedStatus as typeof day.status;
        day.lastOut = (request.payload.requestedLastOut as string | null) ?? day.lastOut;
        day.wasRegularised = true;
      }
    }
  });
}

export async function commentOnRequest(user: CurrentUser, requestId: string, comment: string): Promise<void> {
  await write(() => {
    const request = store.requests.find((r) => r.id === requestId);
    if (!request) throw new Error('Request not found');
    request.decisionComments.push({
      by: user.employee.id,
      on: new Date().toISOString(),
      comment,
      decision: 'commented',
    });
  });
}

/** A notice from HR is acknowledged, not approved. */
export async function acknowledgeRequest(user: CurrentUser, requestId: string): Promise<void> {
  await write(() => {
    const request = store.requests.find((r) => r.id === requestId);
    if (!request) throw new Error('Request not found');
    request.status = 'approved';
    request.currentApprover = null;
    request.decisionComments.push({
      by: user.employee.id,
      on: new Date().toISOString(),
      comment: 'Read',
      decision: 'commented',
    });
  });
}

export type AttendanceRequestType = 'wfh' | 'on-duty' | 'overtime' | 'partial-day';

/** Raise Request — the four things section 8 lets a person ask for. */
export async function submitAttendanceRequest(
  employeeId: string,
  type: AttendanceRequestType,
  payload: Record<string, unknown>,
): Promise<void> {
  await write(() => {
    const employee = store.employees.find((e) => e.id === employeeId);
    store.requests.unshift({
      id: `req-${type}-${employeeId}-${Date.now()}`,
      type,
      raisedBy: employeeId,
      raisedOn: new Date().toISOString(),
      currentApprover: employee?.managerId ?? 'emp-005',
      status: 'pending',
      payload,
      decisionComments: [],
    });
  });
}
