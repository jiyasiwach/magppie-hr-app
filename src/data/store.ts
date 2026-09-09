import type {
  Announcement,
  Asset,
  AttendanceDay,
  EmployeeDocument,
  Employee,
  LeaveRequest,
  LeaveTransaction,
  Notification,
  PolicyAcknowledgement,
  Post,
  Punch,
  Request,
} from '@/lib/types';
import * as mocks from '@/mocks';

/**
 * The mock store.
 *
 * Mock files are read once into mutable arrays so that actions taken in the UI
 * (approving a request, punching in, archiving a document) actually change what
 * the screens show for the rest of the session. Nothing persists across a
 * reload, and nothing is ever removed — records are archived or cancelled.
 *
 * A back-end developer deletes this file and points `src/data/*` at the API.
 */
export const store = {
  employees: [...mocks.employees] as Employee[],
  employmentRecords: [...mocks.employmentRecords],
  punches: [...mocks.punches] as Punch[],
  attendanceDays: [...mocks.attendanceDays] as AttendanceDay[],
  leaveTypes: [...mocks.leaveTypes],
  leaveTransactions: [...mocks.leaveTransactions] as LeaveTransaction[],
  leaveRequests: [...mocks.leaveRequests] as LeaveRequest[],
  requests: [...mocks.requests] as Request[],
  documents: [...mocks.employeeDocuments] as EmployeeDocument[],
  notifications: [...mocks.notifications] as Notification[],
  policies: [...mocks.policies],
  policyAcknowledgements: [...mocks.policyAcknowledgements] as PolicyAcknowledgement[],
  holidays: [...mocks.holidays],
  shifts: [...mocks.shifts],
  assets: [...mocks.assets] as Asset[],
  announcements: [...mocks.announcements] as Announcement[],
  posts: [...mocks.posts] as Post[],
};

/** Bumped by every mutation so open screens know to re-read. */
let version = 0;
const listeners = new Set<() => void>();

export function dataVersion(): number {
  return version;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function commit(): void {
  version += 1;
  listeners.forEach((l) => l());
}

// --- Review aids -----------------------------------------------------------
// Toggled from Settings so the error and empty states can actually be seen
// rather than taken on trust.

export const reviewFlags = {
  simulateFailure: false,
  simulateEmpty: false,
  latencyMs: 220,
};

export class DataError extends Error {
  constructor(message = 'Could not load this. The request failed.') {
    super(message);
    this.name = 'DataError';
  }
}

/** Every read goes through here, so latency and failure behave consistently. */
export async function read<T>(fn: () => T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, reviewFlags.latencyMs));
  if (reviewFlags.simulateFailure) throw new DataError();
  return fn();
}

export async function write<T>(fn: () => T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, reviewFlags.latencyMs));
  if (reviewFlags.simulateFailure) throw new DataError('Could not save. The request failed.');
  const result = fn();
  commit();
  return result;
}
