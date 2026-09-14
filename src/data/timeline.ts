import type { CurrentUser } from '@/lib/auth';
import type { TimelineEntry } from '@/lib/types';
import { MOCK_TODAY } from '@/lib/clock';
import { canViewPersonalData, isSelf, managesEmployee } from '@/lib/permissions';
import { getLndCompletions } from './lnd';
import { findEntitySync, findPolicyGroupSync } from './organisation';
import { read, store } from './store';

/**
 * One continuous record of a person's time at the company.
 *
 * Every entry is GENERATED from the record that caused it — an employment row,
 * a joining date, an L&D completion — never typed in by hand. That is what
 * keeps it honest: if the timeline and the records disagree, the timeline is
 * wrong and can be regenerated.
 */
export async function getTimeline(employeeId: string): Promise<TimelineEntry[]> {
  const lnd = await getLndCompletions(employeeId);

  return read(() => {
    const employee = store.employees.find((e) => e.id === employeeId);
    if (!employee) return [];

    const entries: TimelineEntry[] = [];
    const push = (e: Omit<TimelineEntry, 'id'>) =>
      entries.push({ id: `tl-${employeeId}-${entries.length}`, ...e });

    const entityName = (id: string) => findEntitySync(id)?.shortName ?? id;
    const groupName = (id: string) => findPolicyGroupSync(id)?.name ?? id;

    push({
      employeeId,
      date: employee.joiningDate,
      type: 'joined',
      description: `Joined ${entityName(employee.entityId)} as ${employee.designation} in ${employee.department}.`,
      sourceRecordId: employee.id,
      sourceModule: 'hr',
      jobRelated: true,
    });

    /**
     * FLAGGED: there is no probation-confirmation record anywhere. This is
     * inferred from the probation end date having passed while the person is
     * active, which is a guess, not an event. A real confirmation step would
     * write its own record.
     */
    if (
      employee.probationEndDate &&
      employee.probationEndDate < MOCK_TODAY &&
      employee.status === 'active'
    ) {
      push({
        employeeId,
        date: employee.probationEndDate,
        type: 'probation-confirmed',
        description: 'Probation period ended.',
        sourceRecordId: employee.id,
        sourceModule: 'hr',
        jobRelated: true,
      });
    }

    // Changes are read by comparing consecutive employment records.
    const records = store.employmentRecords
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => a.validFrom.localeCompare(b.validFrom));

    records.forEach((record, i) => {
      const previous = records[i - 1];
      if (!previous) return;

      if (previous.entityId !== record.entityId) {
        push({
          employeeId,
          date: record.validFrom,
          type: 'entity-transfer',
          description: `Transferred from ${entityName(previous.entityId)} to ${entityName(record.entityId)}. Service is continuous.`,
          sourceRecordId: record.id,
          sourceModule: 'hr',
          jobRelated: true,
        });
      }
      if (previous.designation !== record.designation) {
        push({
          employeeId,
          date: record.validFrom,
          type: 'role-change',
          description: `${previous.designation} → ${record.designation}.`,
          sourceRecordId: record.id,
          sourceModule: 'hr',
          jobRelated: true,
        });
      }
      if (previous.department !== record.department) {
        push({
          employeeId,
          date: record.validFrom,
          type: 'department-change',
          description: `Moved from ${previous.department} to ${record.department}.`,
          sourceRecordId: record.id,
          sourceModule: 'hr',
          jobRelated: true,
        });
      }
      if (previous.managerId !== record.managerId) {
        const from = store.employees.find((e) => e.id === previous.managerId)?.fullName ?? 'nobody';
        const to = store.employees.find((e) => e.id === record.managerId)?.fullName ?? 'nobody';
        push({
          employeeId,
          date: record.validFrom,
          type: 'manager-change',
          description: `Reporting line changed from ${from} to ${to}.`,
          sourceRecordId: record.id,
          sourceModule: 'hr',
          jobRelated: true,
        });
      }
      if (previous.policyGroupId !== record.policyGroupId) {
        push({
          employeeId,
          date: record.validFrom,
          type: 'policy-group-change',
          description: `Working rules changed from "${groupName(previous.policyGroupId)}" to "${groupName(record.policyGroupId)}".`,
          sourceRecordId: record.id,
          sourceModule: 'hr',
          jobRelated: true,
        });
      }
    });

    lnd.forEach((c) => {
      push({
        employeeId,
        date: c.completedOn,
        type: c.kind === 'assessment' ? 'assessment-passed' : 'training-completed',
        description:
          c.kind === 'assessment'
            ? `${c.moduleTitle} — ${c.passed ? 'passed' : 'not passed'}.`
            : `Completed ${c.moduleTitle}.`,
        sourceRecordId: c.id,
        sourceModule: 'l&d',
        jobRelated: true,
      });
    });

    const exitRecord = records.find((r) => r.validTo !== null && employee.status === 'inactive');
    if (exitRecord?.validTo) {
      push({
        employeeId,
        date: exitRecord.validTo,
        type: 'exit',
        description: 'Left the company.',
        sourceRecordId: exitRecord.id,
        sourceModule: 'hr',
        jobRelated: true,
      });
    }

    /**
     * FLAGGED: appraisals are in the brief's timeline list, but performance
     * reviews are explicitly out of scope and there is no appraisal record
     * anywhere. No appraisal entries are invented.
     */

    return entries.sort((a, b) => b.date.localeCompare(a.date));
  });
}

/**
 * The employee and HR see the whole record. A manager sees only the
 * job-related entries for their own team members — not the full history.
 */
export function timelineVisibleTo(user: CurrentUser, employeeId: string, entries: TimelineEntry[]): TimelineEntry[] {
  if (isSelf(user, employeeId) || user.role === 'hr-admin') return entries;
  if (managesEmployee(user, employeeId)) return entries.filter((e) => e.jobRelated);
  return [];
}

export function canSeeTimeline(user: CurrentUser, employeeId: string): boolean {
  return canViewPersonalData(user, employeeId);
}
