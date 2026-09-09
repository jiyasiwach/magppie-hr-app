import type { EmploymentRecord } from '@/lib/types';
import { employees } from './employees';

/**
 * Historical rows only — a handful of promotions and transfers so the activity
 * trail has something true to show. The *current* row for everyone else is
 * derived below from the Employee record.
 */
const history: EmploymentRecord[] = [
  { id: 'er-h-001', employeeId: 'emp-008', department: 'Design', designation: 'Kitchen Designer', managerId: 'emp-002', validFrom: '2019-06-17', validTo: '2023-03-31' },
  { id: 'er-h-002', employeeId: 'emp-014', department: 'Production', designation: 'CNC Operator', managerId: 'emp-003', validFrom: '2018-05-14', validTo: '2021-07-31' },
  { id: 'er-h-003', employeeId: 'emp-022', department: 'Sales', designation: 'Sales Consultant', managerId: 'emp-004', validFrom: '2018-12-03', validTo: '2022-01-31' },
  { id: 'er-h-004', employeeId: 'emp-030', department: 'Installation', designation: 'Installer', managerId: 'emp-007', validFrom: '2018-08-27', validTo: '2020-09-30' },
  { id: 'er-h-005', employeeId: 'emp-012', department: 'Design', designation: 'Junior 3D Visualiser', managerId: 'emp-002', validFrom: '2020-10-12', validTo: '2022-06-30' },
];

const currentStartDates: Record<string, string> = {
  'emp-008': '2023-04-01',
  'emp-014': '2021-08-01',
  'emp-022': '2022-02-01',
  'emp-030': '2020-10-01',
  'emp-012': '2022-07-01',
};

const current: EmploymentRecord[] = employees.map((e) => ({
  id: `er-c-${e.id}`,
  employeeId: e.id,
  department: e.department,
  designation: e.designation,
  managerId: e.managerId,
  validFrom: currentStartDates[e.id] ?? e.joiningDate,
  validTo: e.status === 'inactive' ? '2026-06-30' : null,
}));

export const employmentRecords: EmploymentRecord[] = [...history, ...current].sort((a, b) =>
  a.employeeId === b.employeeId ? a.validFrom.localeCompare(b.validFrom) : a.employeeId.localeCompare(b.employeeId),
);
