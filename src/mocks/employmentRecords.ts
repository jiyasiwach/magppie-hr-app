import type { EmploymentRecord } from '@/lib/types';
import { employees } from './employees';

/**
 * Historical rows only — promotions, transfers, and one move between legal
 * entities. The *current* row for everyone else is derived below from the
 * Employee record.
 *
 * Entity and policy group live here rather than only on the employee, which is
 * what makes a transfer dated history instead of an overwrite.
 */
const history: EmploymentRecord[] = [
  { id: 'er-h-001', employeeId: 'emp-008', department: 'Design', designation: 'Kitchen Designer', managerId: 'emp-002', entityId: 'ent-interiors', policyGroupId: 'pg-office', validFrom: '2019-06-17', validTo: '2023-03-31' },
  { id: 'er-h-002', employeeId: 'emp-014', department: 'Production', designation: 'CNC Operator', managerId: 'emp-003', entityId: 'ent-stone', policyGroupId: 'pg-factory-a', validFrom: '2018-05-14', validTo: '2021-07-31' },
  { id: 'er-h-003', employeeId: 'emp-022', department: 'Sales', designation: 'Sales Consultant', managerId: 'emp-004', entityId: 'ent-interiors', policyGroupId: 'pg-showroom', validFrom: '2018-12-03', validTo: '2022-01-31' },
  { id: 'er-h-004', employeeId: 'emp-030', department: 'Installation', designation: 'Installer', managerId: 'emp-007', entityId: 'ent-install', policyGroupId: 'pg-site', validFrom: '2018-08-27', validTo: '2020-09-30' },
  { id: 'er-h-005', employeeId: 'emp-012', department: 'Design', designation: 'Junior 3D Visualiser', managerId: 'emp-002', entityId: 'ent-interiors', policyGroupId: 'pg-office', validFrom: '2020-10-12', validTo: '2022-06-30' },

  /**
   * An entity transfer: Ritu moved from the factory company to Interiors when
   * production planning was centralised. One continuous record — same profile,
   * same documents, same service history — with the change dated.
   */
  { id: 'er-h-006', employeeId: 'emp-021', department: 'Production', designation: 'Production Planner', managerId: 'emp-003', entityId: 'ent-stone', policyGroupId: 'pg-factory-a', validFrom: '2023-07-10', validTo: '2026-03-31' },

  /** A policy-group change without an entity change: moved off the shop floor. */
  { id: 'er-h-007', employeeId: 'emp-019', department: 'Production', designation: 'Store Keeper', managerId: 'emp-003', entityId: 'ent-stone', policyGroupId: 'pg-factory-b', validFrom: '2019-03-25', validTo: '2024-12-31' },
];

const currentStartDates: Record<string, string> = {
  'emp-008': '2023-04-01',
  'emp-014': '2021-08-01',
  'emp-022': '2022-02-01',
  'emp-030': '2020-10-01',
  'emp-012': '2022-07-01',
  'emp-021': '2026-04-01',
  'emp-019': '2025-01-01',
};

const current: EmploymentRecord[] = employees.map((e) => ({
  id: `er-c-${e.id}`,
  employeeId: e.id,
  department: e.department,
  designation: e.designation,
  managerId: e.managerId,
  entityId: e.entityId,
  policyGroupId: e.policyGroupId,
  validFrom: currentStartDates[e.id] ?? e.joiningDate,
  validTo: e.status === 'inactive' ? '2026-06-30' : null,
}));

export const employmentRecords: EmploymentRecord[] = [...history, ...current].sort((a, b) =>
  a.employeeId === b.employeeId ? a.validFrom.localeCompare(b.validFrom) : a.employeeId.localeCompare(b.employeeId),
);
