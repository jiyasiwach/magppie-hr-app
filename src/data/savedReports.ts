import type { CurrentUser } from '@/lib/auth';
import type { ReportRecordType, SavedReport } from '@/lib/types';
import { visibleEmployeeIds } from '@/lib/permissions';
import { valueForExport } from './customFields';
import { read, store, write } from './store';

/**
 * ============================================================================
 * Reports HR can build themselves
 * ============================================================================
 * The rule that report builders usually get wrong, and that is enforced here:
 *
 *   VISIBILITY IS EVALUATED FOR WHOEVER RUNS THE REPORT, NOT WHOEVER BUILT IT.
 *
 * A saved report is a question, not a result set. HR builds "site pass numbers
 * for the installation team"; a manager running the same saved report gets
 * their own reporting line and nothing else, and any column they cannot see
 * comes back blank rather than populated from the author's rights.
 *
 * No report can rank or score individual people. Sorting is by a column, and
 * there is no scoring column to sort by.
 * ============================================================================
 */

export const BASE_COLUMNS: Record<ReportRecordType, Array<{ key: string; label: string }>> = {
  employee: [
    { key: 'fullName', label: 'Name' },
    { key: 'employeeCode', label: 'Employee code' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'location', label: 'Location' },
    { key: 'entity', label: 'Entity' },
    { key: 'policyGroup', label: 'Policy group' },
    { key: 'employmentType', label: 'Employment type' },
    { key: 'status', label: 'Status' },
    { key: 'joiningDate', label: 'Joining date' },
    { key: 'probationEndDate', label: 'Probation ends' },
    { key: 'workEmail', label: 'Work email' },
  ],
  attendance: [
    { key: 'fullName', label: 'Name' },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status' },
    { key: 'totalHours', label: 'Hours' },
  ],
  leave: [
    { key: 'fullName', label: 'Name' },
    { key: 'leaveType', label: 'Leave type' },
    { key: 'startDate', label: 'From' },
    { key: 'endDate', label: 'To' },
    { key: 'status', label: 'Status' },
  ],
  request: [
    { key: 'fullName', label: 'Raised by' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'raisedOn', label: 'Raised on' },
  ],
  asset: [
    { key: 'fullName', label: 'Issued to' },
    { key: 'name', label: 'Asset' },
    { key: 'category', label: 'Category' },
    { key: 'serial', label: 'Serial' },
    { key: 'status', label: 'Status' },
  ],
};

export interface ReportRow {
  [column: string]: string;
}

export interface ReportRun {
  report: SavedReport;
  columns: Array<{ key: string; label: string }>;
  rows: ReportRow[];
  groups: Array<{ label: string; rows: ReportRow[] }> | null;
  /** How the scope was narrowed for whoever is running it. */
  scopeNote: string;
  /** Columns the runner asked for but is not allowed to see. */
  hiddenColumns: string[];
}

export async function listSavedReports(user: CurrentUser): Promise<SavedReport[]> {
  return read(() =>
    store.savedReports
      .filter((r) => r.createdBy === user.employee.id || r.sharedWith.includes(user.role))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
}

export async function getSavedReport(user: CurrentUser, id: string): Promise<SavedReport | null> {
  return read(() => {
    const report = store.savedReports.find((r) => r.id === id);
    if (!report) return null;
    return report.createdBy === user.employee.id || report.sharedWith.includes(user.role) ? report : null;
  });
}

function matches(value: string, operator: string, target: string): boolean {
  const a = value.toLowerCase();
  const b = target.toLowerCase();
  switch (operator) {
    case 'eq':
      return a === b;
    case 'ne':
      return a !== b;
    case 'contains':
      return a.includes(b);
    case 'gt':
      return value > target;
    case 'lt':
      return value < target;
    default:
      return true;
  }
}

export async function runReport(user: CurrentUser, report: SavedReport): Promise<ReportRun> {
  return read(() => {
    // Scope first, always, and for the runner.
    const scopeIds = new Set(visibleEmployeeIds(user));
    const people = store.employees.filter((e) => scopeIds.has(e.id));

    const entityName = (id: string) => store.entities.find((x) => x.id === id)?.shortName ?? id;
    const groupName = (id: string) => store.policyGroups.find((x) => x.id === id)?.name ?? id;

    const hiddenColumns: string[] = [];
    const resolveCustom = (key: string, ownerId: string): string => {
      const fieldKey = key.slice('custom:'.length);
      const value = valueForExport(user, fieldKey, ownerId);
      if (value === null) {
        const field = store.customFields.find((f) => f.key === fieldKey);
        if (field && !hiddenColumns.includes(field.label)) hiddenColumns.push(field.label);
        return '';
      }
      return value;
    };

    let rows: ReportRow[] = [];

    if (report.recordType === 'employee') {
      rows = people.map((e) => {
        const row: ReportRow = {};
        report.columns.forEach((col) => {
          if (col.startsWith('custom:')) {
            row[col] = resolveCustom(col, e.id);
          } else if (col === 'entity') row[col] = entityName(e.entityId);
          else if (col === 'policyGroup') row[col] = groupName(e.policyGroupId);
          else row[col] = String((e as unknown as Record<string, unknown>)[col] ?? '');
        });
        return row;
      });
    } else if (report.recordType === 'attendance') {
      rows = store.attendanceDays
        .filter((d) => scopeIds.has(d.employeeId))
        .slice(0, 500)
        .map((d) => ({
          fullName: store.employees.find((e) => e.id === d.employeeId)?.fullName ?? '',
          date: d.date,
          status: d.status,
          totalHours: String(d.totalHours),
        }));
    } else if (report.recordType === 'leave') {
      rows = store.leaveRequests
        .filter((r) => scopeIds.has(r.employeeId))
        .map((r) => ({
          fullName: store.employees.find((e) => e.id === r.employeeId)?.fullName ?? '',
          leaveType: store.leaveTypes.find((t) => t.id === r.leaveTypeId)?.name ?? '',
          startDate: r.startDate,
          endDate: r.endDate,
          status: r.status,
        }));
    } else if (report.recordType === 'request') {
      rows = store.requests
        .filter((r) => scopeIds.has(r.raisedBy))
        .map((r) => ({
          fullName: store.employees.find((e) => e.id === r.raisedBy)?.fullName ?? '',
          type: r.type,
          status: r.status,
          raisedOn: r.raisedOn.slice(0, 10),
        }));
    } else {
      rows = store.assets
        .filter((a) => a.employeeId && scopeIds.has(a.employeeId))
        .map((a) => {
          const row: ReportRow = {
            fullName: store.employees.find((e) => e.id === a.employeeId)?.fullName ?? '',
            name: a.name,
            category: a.category,
            serial: a.serial ?? '',
            status: a.status,
          };
          report.columns
            .filter((c) => c.startsWith('custom:'))
            .forEach((c) => {
              row[c] = resolveCustom(c, a.id);
            });
          return row;
        });
    }

    report.filters.forEach((f) => {
      rows = rows.filter((r) => matches(r[f.column] ?? '', f.operator, f.value));
    });

    const columns = report.columns.map((key) => {
      if (key.startsWith('custom:')) {
        const field = store.customFields.find((f) => f.key === key.slice('custom:'.length));
        return { key, label: field?.label ?? key };
      }
      const base = BASE_COLUMNS[report.recordType].find((c) => c.key === key);
      return { key, label: base?.label ?? key };
    });

    const groups = report.groupBy
      ? [...new Set(rows.map((r) => r[report.groupBy!] ?? '—'))].sort().map((label) => ({
          label,
          rows: rows.filter((r) => (r[report.groupBy!] ?? '—') === label),
        }))
      : null;

    return {
      report,
      columns,
      rows,
      groups,
      scopeNote:
        user.role === 'hr-admin'
          ? 'Run across the whole organisation, because you are HR.'
          : `Run across your own reporting line only — ${people.length} ${people.length === 1 ? 'person' : 'people'} — regardless of who built this report.`,
      hiddenColumns,
    };
  });
}

export async function saveReport(
  user: CurrentUser,
  input: Omit<SavedReport, 'id' | 'createdBy' | 'createdOn'>,
): Promise<string> {
  return write(() => {
    if (!input.name.trim()) throw new Error('Give the report a name.');
    if (input.columns.length === 0) throw new Error('Choose at least one column.');
    const id = `rep-${Date.now()}`;
    store.savedReports.push({
      ...input,
      id,
      name: input.name.trim(),
      createdBy: user.employee.id,
      createdOn: new Date().toISOString(),
    });
    return id;
  });
}
