import type { CurrentUser } from './auth';
import type { EmployeeDocument, Request } from './types';
import { employees } from '@/mocks';

/**
 * Who may see and do what.
 *
 * FLAGGED: this app has no stated permission matrix. What is here is the
 * narrowest reading of section 6 — employees see themselves, managers see their
 * own reporting line, HR admin sees everything. Nothing here is a policy
 * decision anybody has signed off on.
 */

/** Everyone below this person in the reporting tree, at any depth. */
export function reportingLine(managerId: string): string[] {
  const out: string[] = [];
  const walk = (id: string) => {
    employees
      .filter((e) => e.managerId === id)
      .forEach((e) => {
        out.push(e.id);
        walk(e.id);
      });
  };
  walk(managerId);
  return out;
}

export function directReports(managerId: string): string[] {
  return employees.filter((e) => e.managerId === managerId).map((e) => e.id);
}

export function isSelf(user: CurrentUser, employeeId: string): boolean {
  return user.employee.id === employeeId;
}

export function managesEmployee(user: CurrentUser, employeeId: string): boolean {
  return reportingLine(user.employee.id).includes(employeeId);
}

/** Attendance, leave, and the personal side of a profile. */
export function canViewPersonalData(user: CurrentUser, employeeId: string): boolean {
  if (user.role === 'hr-admin') return true;
  if (isSelf(user, employeeId)) return true;
  return user.role === 'manager' && managesEmployee(user, employeeId);
}

/** The directory card — name, department, designation, work email, location. */
export function canViewDirectoryEntry(): boolean {
  return true;
}

export function canEditEmployeeFully(user: CurrentUser): boolean {
  return user.role === 'hr-admin';
}

/** The small set of fields a person may change about themselves. */
export const selfEditableFields = ['personalPhone', 'photo'] as const;

export function canEditOwnField(user: CurrentUser, employeeId: string, field: string): boolean {
  if (canEditEmployeeFully(user)) return true;
  return isSelf(user, employeeId) && (selfEditableFields as readonly string[]).includes(field);
}

export function canViewDocument(user: CurrentUser, document: EmployeeDocument): boolean {
  if (user.role === 'hr-admin') return true;
  if (document.visibility === 'hr-only') return false;
  if (isSelf(user, document.employeeId)) return true;
  return document.visibility === 'manager' && managesEmployee(user, document.employeeId);
}

export function canSeeApprovals(user: CurrentUser): boolean {
  return user.role === 'manager' || user.role === 'hr-admin';
}

export function canActOnRequest(user: CurrentUser, request: Request): boolean {
  if (request.status !== 'pending') return false;
  if (user.role === 'hr-admin') return true;
  return request.currentApprover === user.employee.id;
}

export function canSeeTeamCalendar(user: CurrentUser): boolean {
  return user.role === 'manager' || user.role === 'hr-admin';
}

export function canSeeSettings(user: CurrentUser): boolean {
  return user.role === 'hr-admin';
}

/** Which people this user's org-wide views are allowed to cover. */
export function visibleEmployeeIds(user: CurrentUser): string[] {
  if (user.role === 'hr-admin') return employees.map((e) => e.id);
  if (user.role === 'manager') return [user.employee.id, ...reportingLine(user.employee.id)];
  return [user.employee.id];
}
