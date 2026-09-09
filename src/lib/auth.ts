import type { Employee, Role } from './types';
import { employees } from '@/mocks';

/**
 * ============================================================================
 * THE AUTH SEAM
 * ============================================================================
 * `getCurrentUser()` is the ONLY place in this app that decides who is signed
 * in. There is no fake login screen, no "continue as demo user" button and no
 * hardcoded person inside a component. When real auth arrives, replace the body
 * of this function with a session lookup and delete `setActiveMockUserId`.
 */

export interface CurrentUser {
  employee: Employee;
  role: Role;
}

/** Who the app opens as. */
const DEFAULT_MOCK_USER_ID = 'emp-008';

/**
 * The three people the role switcher offers. One per role, so all three views
 * can be checked. Mock-only — goes away with real auth.
 */
export const mockPersonas: Array<{ employeeId: string; label: string }> = [
  { employeeId: 'emp-008', label: 'Employee' },
  { employeeId: 'emp-003', label: 'Manager' },
  { employeeId: 'emp-005', label: 'HR admin' },
];

let activeMockUserId = DEFAULT_MOCK_USER_ID;

/** Mock-only. Delete alongside the mock data. */
export function setActiveMockUserId(employeeId: string): void {
  activeMockUserId = employeeId;
}

/** Mock-only. */
export function getActiveMockUserId(): string {
  return activeMockUserId;
}

/**
 * Role is not stored on the Employee record — section 9 has no role field — so
 * it is derived. FLAGGED: the real rule for who is an HR admin has not been
 * stated, so this is a stand-in, not a decision.
 *  - HR admin: anyone in Human Resources, plus the Managing Director
 *  - Manager:  anyone with at least one direct report
 *  - Employee: everyone else
 */
export function deriveRole(employee: Employee): Role {
  if (employee.department === 'Human Resources' || employee.managerId === null) {
    return 'hr-admin';
  }
  const hasReports = employees.some((e) => e.managerId === employee.id);
  return hasReports ? 'manager' : 'employee';
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const employee = employees.find((e) => e.id === activeMockUserId) ?? employees[0];
  return { employee, role: deriveRole(employee) };
}

export const roleLabels: Record<Role, string> = {
  employee: 'Employee',
  manager: 'Manager',
  'hr-admin': 'HR admin',
};
