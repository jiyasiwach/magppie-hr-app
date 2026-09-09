import type { CurrentUser } from '@/lib/auth';
import type { Employee, EmploymentRecord } from '@/lib/types';
import { canViewPersonalData, visibleEmployeeIds } from '@/lib/permissions';
import { read, reviewFlags, store } from './store';

export interface DirectoryFilters {
  search?: string;
  department?: string;
  location?: string;
  designation?: string;
  status?: string;
}

export async function listEmployees(filters: DirectoryFilters = {}): Promise<Employee[]> {
  return read(() => {
    if (reviewFlags.simulateEmpty) return [];
    const search = filters.search?.trim().toLowerCase() ?? '';
    return store.employees
      .filter((e) => (filters.department ? e.department === filters.department : true))
      .filter((e) => (filters.location ? e.location === filters.location : true))
      .filter((e) => (filters.designation ? e.designation === filters.designation : true))
      .filter((e) => (filters.status ? e.status === filters.status : true))
      .filter((e) =>
        search
          ? [e.fullName, e.employeeCode, e.workEmail, e.designation, e.department]
              .join(' ')
              .toLowerCase()
              .includes(search)
          : true,
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  });
}

export async function getEmployee(id: string): Promise<Employee | null> {
  return read(() => store.employees.find((e) => e.id === id) ?? null);
}

export function findEmployeeSync(id: string | null | undefined): Employee | null {
  if (!id) return null;
  return store.employees.find((e) => e.id === id) ?? null;
}

export async function getEmploymentHistory(employeeId: string): Promise<EmploymentRecord[]> {
  return read(() =>
    store.employmentRecords
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => b.validFrom.localeCompare(a.validFrom)),
  );
}

export interface ActivityEntry {
  on: string;
  title: string;
  detail: string;
}

/**
 * Built only from records that exist — employment history, documents, leave and
 * requests. There is no audit-log table in section 9, so this is a derived
 * trail, not a real audit trail. FLAGGED.
 */
export async function getActivityTrail(employeeId: string): Promise<ActivityEntry[]> {
  return read(() => {
    const entries: ActivityEntry[] = [];
    const employee = store.employees.find((e) => e.id === employeeId);
    if (employee) {
      entries.push({ on: employee.joiningDate, title: 'Joined Magppie', detail: `${employee.designation}, ${employee.department}` });
    }
    store.employmentRecords
      .filter((r) => r.employeeId === employeeId)
      .forEach((r) => {
        entries.push({
          on: r.validFrom,
          title: r.validTo ? 'Role held' : 'Current role',
          detail: `${r.designation}, ${r.department}${r.validTo ? ` (until ${r.validTo})` : ''}`,
        });
      });
    store.documents
      .filter((d) => d.employeeId === employeeId)
      .forEach((d) => {
        entries.push({ on: d.uploadedOn.slice(0, 10), title: 'Document uploaded', detail: d.fileName });
      });
    store.requests
      .filter((r) => r.raisedBy === employeeId)
      .forEach((r) => {
        entries.push({ on: r.raisedOn.slice(0, 10), title: `Raised a ${r.type} request`, detail: `Status: ${r.status}` });
      });
    return entries.sort((a, b) => b.on.localeCompare(a.on));
  });
}

export interface TreeNode {
  employee: Employee;
  reports: TreeNode[];
}

/** Reporting tree rooted at any person. Handles no manager and many reports. */
export async function getReportingTree(rootId: string): Promise<TreeNode | null> {
  return read(() => {
    const root = store.employees.find((e) => e.id === rootId);
    if (!root) return null;
    const build = (employee: Employee): TreeNode => ({
      employee,
      reports: store.employees
        .filter((e) => e.managerId === employee.id)
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .map(build),
    });
    return build(root);
  });
}

/** The chain of managers above a person, nearest first. Empty if none. */
export async function getManagerChain(employeeId: string): Promise<Employee[]> {
  return read(() => {
    const chain: Employee[] = [];
    let cursor = store.employees.find((e) => e.id === employeeId)?.managerId ?? null;
    while (cursor) {
      const manager = store.employees.find((e) => e.id === cursor);
      if (!manager) break;
      chain.push(manager);
      cursor = manager.managerId;
    }
    return chain;
  });
}

export async function listTeam(user: CurrentUser): Promise<Employee[]> {
  return read(() => {
    const ids = new Set(visibleEmployeeIds(user));
    return store.employees
      .filter((e) => ids.has(e.id) && e.id !== user.employee.id)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  });
}

export function canOpenProfile(user: CurrentUser, employeeId: string): boolean {
  return canViewPersonalData(user, employeeId);
}
