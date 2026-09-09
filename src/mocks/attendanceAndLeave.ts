import type {
  AttendanceDay,
  AttendanceStatus,
  LeaveRequest,
  LeaveTransaction,
  Punch,
  Request,
} from '@/lib/types';
import { MOCK_TODAY } from '@/lib/clock';
import { addDays, datesBetween, dayOfWeek, inclusiveDayCount } from '@/lib/date';
import { employees } from './employees';
import { holidays, weeklyOffDays } from './calendar';
import { leaveTypes } from './leaveTypes';
import { intBetween, makeRng, pick } from './seed';

/** Attendance history is generated over this window only. */
export const ATTENDANCE_RANGE_START = '2026-06-01';
export const ATTENDANCE_RANGE_END = MOCK_TODAY;
/** Leave ledgers start at the beginning of the Indian financial year. */
export const LEAVE_YEAR_START = '2026-04-01';

const IST = '+05:30';
const holidayDates = new Set(holidays.map((h) => h.date));
const staff = employees.filter((e) => e.status !== 'inactive');

const stamp = (date: string, hh: number, mm: number) =>
  `${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00${IST}`;

const isWeeklyOff = (date: string) => weeklyOffDays.includes(dayOfWeek(date));
const isWorkingDay = (date: string) => !isWeeklyOff(date) && !holidayDates.has(date);

// ---------------------------------------------------------------------------
// Leave requests
// ---------------------------------------------------------------------------

const leaveReasons = [
  'Family function out of town',
  'Not keeping well',
  'Personal work',
  'Travelling home for a few days',
  'Medical appointment',
  'House shifting',
  'Child’s school event',
];

const requestableTypes = leaveTypes.filter((t) => t.id !== 'lt-maternity' && t.id !== 'lt-paternity');

function buildLeaveRequests(): LeaveRequest[] {
  const out: LeaveRequest[] = [];

  staff.forEach((employee, index) => {
    const rng = makeRng(`leave:${employee.id}`);
    const approvedCount = intBetween(rng, 0, 2);

    for (let i = 0; i < approvedCount; i += 1) {
      let start = addDays(ATTENDANCE_RANGE_START, intBetween(rng, 2, 90));
      while (!isWorkingDay(start)) start = addDays(start, 1);
      if (start >= MOCK_TODAY) continue;
      const length = intBetween(rng, 1, 3);
      const end = addDays(start, length - 1);
      const type = pick(rng, requestableTypes);
      out.push({
        id: `lr-${employee.id}-a${i}`,
        employeeId: employee.id,
        leaveTypeId: type.id,
        startDate: start,
        endDate: end,
        halfDayStart: type.halfDaysAllowed && length === 1 && rng() < 0.25,
        halfDayEnd: false,
        reason: pick(rng, leaveReasons),
        status: 'approved',
      });
    }

    // Roughly every fourth person has something still waiting on their manager.
    if (index % 4 === 1) {
      let start = addDays(MOCK_TODAY, intBetween(rng, 4, 25));
      while (!isWorkingDay(start)) start = addDays(start, 1);
      const length = intBetween(rng, 1, 4);
      const type = pick(rng, requestableTypes);
      out.push({
        id: `lr-${employee.id}-p0`,
        employeeId: employee.id,
        leaveTypeId: type.id,
        startDate: start,
        endDate: addDays(start, length - 1),
        halfDayStart: false,
        halfDayEnd: type.halfDaysAllowed && rng() < 0.2,
        reason: pick(rng, leaveReasons),
        status: 'pending',
      });
    }
  });

  // A rejected one and a cancelled one, so the history list is not all-approved.
  out.push({
    id: 'lr-emp-023-r0',
    employeeId: 'emp-023',
    leaveTypeId: 'lt-casual',
    startDate: '2026-08-13',
    endDate: '2026-08-14',
    halfDayStart: false,
    halfDayEnd: false,
    reason: 'Long weekend trip',
    status: 'rejected',
  });
  out.push({
    id: 'lr-emp-016-c0',
    employeeId: 'emp-016',
    leaveTypeId: 'lt-sick',
    startDate: '2026-07-22',
    endDate: '2026-07-22',
    halfDayStart: false,
    halfDayEnd: false,
    reason: 'Fever — recovered, came in instead',
    status: 'cancelled',
  });

  return out.sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export const leaveRequests: LeaveRequest[] = buildLeaveRequests();

/** Days a leave request consumes, accounting for half-day flags. */
export function leaveRequestDays(request: LeaveRequest): number {
  const whole = inclusiveDayCount(request.startDate, request.endDate);
  const halves = (request.halfDayStart ? 0.5 : 0) + (request.halfDayEnd ? 0.5 : 0);
  return whole - halves;
}

const approvedLeaveDates = new Map<string, string>();
leaveRequests
  .filter((r) => r.status === 'approved')
  .forEach((r) => {
    datesBetween(r.startDate, r.endDate).forEach((d) => {
      approvedLeaveDates.set(`${r.employeeId}|${d}`, r.id);
    });
  });

// ---------------------------------------------------------------------------
// Punches and attendance days
// ---------------------------------------------------------------------------

const sources = ['biometric', 'biometric', 'biometric', 'web', 'mobile'] as const;

const siteLocations: Record<string, string> = {
  Production: 'Noida Factory — Gate 2',
  Installation: 'Client site',
  Sales: 'Showroom floor',
};

function buildAttendance(): { punches: Punch[]; attendanceDays: AttendanceDay[] } {
  const punches: Punch[] = [];
  const attendanceDays: AttendanceDay[] = [];

  staff.forEach((employee) => {
    const dates = datesBetween(ATTENDANCE_RANGE_START, ATTENDANCE_RANGE_END).filter(
      (d) => d >= employee.joiningDate,
    );

    dates.forEach((date) => {
      const rng = makeRng(`att:${employee.id}:${date}`);
      const id = `ad-${employee.id}-${date}`;
      const base = { id, employeeId: employee.id, date, wasRegularised: false };

      if (holidayDates.has(date)) {
        attendanceDays.push({ ...base, status: 'holiday', firstIn: null, lastOut: null, totalHours: 0 });
        return;
      }
      if (isWeeklyOff(date)) {
        attendanceDays.push({ ...base, status: 'weekly-off', firstIn: null, lastOut: null, totalHours: 0 });
        return;
      }
      if (approvedLeaveDates.has(`${employee.id}|${date}`)) {
        attendanceDays.push({ ...base, status: 'leave', firstIn: null, lastOut: null, totalHours: 0 });
        return;
      }

      const roll = rng();
      let status: AttendanceStatus = 'present';
      if (roll < 0.025) status = 'absent';
      else if (roll < 0.06) status = 'half-day';
      else if (roll < 0.085 && date < MOCK_TODAY) status = 'pending-regularisation';

      if (status === 'absent') {
        attendanceDays.push({ ...base, status, firstIn: null, lastOut: null, totalHours: 0 });
        return;
      }

      const source = pick(rng, sources);
      const location = source === 'mobile' ? (siteLocations[employee.department] ?? 'Head Office') : null;
      const inHour = 9;
      const inMinute = intBetween(rng, 0, 55);

      // Today: people are still at work, so there is an in-punch and no out-punch.
      const isToday = date === MOCK_TODAY;

      if (status === 'pending-regularisation') {
        // A missed out-punch is the commonest reason a day needs fixing.
        punches.push({
          id: `pn-${employee.id}-${date}-1`,
          employeeId: employee.id,
          timestamp: stamp(date, inHour, inMinute),
          direction: 'in',
          source,
          location,
        });
        attendanceDays.push({
          ...base,
          status,
          firstIn: stamp(date, inHour, inMinute),
          lastOut: null,
          totalHours: 0,
        });
        return;
      }

      const outHour = status === 'half-day' ? 13 : intBetween(rng, 18, 19);
      const outMinute = status === 'half-day' ? intBetween(rng, 20, 50) : intBetween(rng, 0, 55);

      punches.push({
        id: `pn-${employee.id}-${date}-1`,
        employeeId: employee.id,
        timestamp: stamp(date, inHour, inMinute),
        direction: 'in',
        source,
        location,
      });

      if (!isToday) {
        // Most people punch out for lunch on the factory floor.
        if (employee.department === 'Production' && status === 'present') {
          punches.push({ id: `pn-${employee.id}-${date}-2`, employeeId: employee.id, timestamp: stamp(date, 13, 30), direction: 'out', source, location });
          punches.push({ id: `pn-${employee.id}-${date}-3`, employeeId: employee.id, timestamp: stamp(date, 14, 5), direction: 'in', source, location });
        }
        punches.push({
          id: `pn-${employee.id}-${date}-9`,
          employeeId: employee.id,
          timestamp: stamp(date, outHour, outMinute),
          direction: 'out',
          source,
          location,
        });
      }

      const firstIn = stamp(date, inHour, inMinute);
      const lastOut = isToday ? null : stamp(date, outHour, outMinute);
      const totalHours = isToday
        ? 0
        : Math.round((outHour + outMinute / 60 - (inHour + inMinute / 60)) * 100) / 100;

      attendanceDays.push({
        ...base,
        status,
        firstIn,
        lastOut,
        totalHours,
        wasRegularised: rng() < 0.05,
      });
    });
  });

  return { punches, attendanceDays };
}

const built = buildAttendance();
export const punches: Punch[] = built.punches;
export const attendanceDays: AttendanceDay[] = built.attendanceDays;

// ---------------------------------------------------------------------------
// Leave ledger — every credit, debit and adjustment behind a balance
// ---------------------------------------------------------------------------

const OPENING = { 'lt-casual': 4, 'lt-sick': 6, 'lt-earned': 8 } as const;
const MONTHLY_ACCRUAL = { 'lt-casual': 1, 'lt-sick': 0.5, 'lt-earned': 1.25 } as const;
const ACCRUAL_MONTHS = ['2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01'];

function buildLeaveTransactions(): LeaveTransaction[] {
  const out: LeaveTransaction[] = [];

  staff.forEach((employee) => {
    (Object.keys(OPENING) as Array<keyof typeof OPENING>).forEach((leaveTypeId) => {
      const joinedThisYear = employee.joiningDate > LEAVE_YEAR_START;
      if (!joinedThisYear) {
        out.push({
          id: `lx-${employee.id}-${leaveTypeId}-open`,
          employeeId: employee.id,
          leaveTypeId,
          date: LEAVE_YEAR_START,
          amount: OPENING[leaveTypeId],
          direction: 'credit',
          reason: 'Opening balance carried into FY 2026–27',
          source: 'opening-balance',
        });
      }

      ACCRUAL_MONTHS.forEach((month) => {
        if (month < employee.joiningDate) return;
        out.push({
          id: `lx-${employee.id}-${leaveTypeId}-${month}`,
          employeeId: employee.id,
          leaveTypeId,
          date: month,
          amount: MONTHLY_ACCRUAL[leaveTypeId],
          direction: 'credit',
          reason: 'Monthly accrual',
          source: 'monthly-accrual',
        });
      });
    });
  });

  leaveRequests
    .filter((r) => r.status === 'approved')
    .forEach((r) => {
      out.push({
        id: `lx-${r.id}`,
        employeeId: r.employeeId,
        leaveTypeId: r.leaveTypeId,
        date: r.startDate,
        amount: leaveRequestDays(r),
        direction: 'debit',
        reason: `Leave taken — ${r.reason}`,
        source: 'leave-request',
      });
    });

  // A few hand-made HR corrections, so the breakdown shows a real adjustment.
  out.push({ id: 'lx-adj-1', employeeId: 'emp-008', leaveTypeId: 'lt-earned', date: '2026-08-05', amount: 1, direction: 'adjustment', reason: 'Comp-off for Sunday site visit on 2 Aug', source: 'hr-adjustment' });
  out.push({ id: 'lx-adj-2', employeeId: 'emp-015', leaveTypeId: 'lt-casual', date: '2026-07-18', amount: 1, direction: 'adjustment', reason: 'Leave wrongly debited in June — reversed', source: 'hr-adjustment' });
  out.push({ id: 'lx-adj-3', employeeId: 'emp-022', leaveTypeId: 'lt-sick', date: '2026-06-30', amount: 0.5, direction: 'adjustment', reason: 'Half day marked in error', source: 'hr-adjustment' });

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export const leaveTransactions: LeaveTransaction[] = buildLeaveTransactions();

// ---------------------------------------------------------------------------
// Generic requests — what the approvals queue actually reads
// ---------------------------------------------------------------------------

const regularisationReasons = [
  'Out-punch missed — left directly from the client site.',
  'Biometric did not read my finger in the morning.',
  'Was at the Noida plant all day, punched at the wrong gate.',
  'Site visit — no biometric there.',
  'Phone died before I could punch out.',
];

function buildRequests(): Request[] {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const out: Request[] = [];

  leaveRequests.forEach((r) => {
    const employee = byId.get(r.employeeId);
    // Applied five days ahead, but never later than yesterday — a request
    // cannot have been raised in the future.
    const proposed = addDays(r.startDate, -5);
    const raisedDate = proposed < MOCK_TODAY ? proposed : addDays(MOCK_TODAY, -1);
    const raisedOn = `${raisedDate}T10:30:00${IST}`;
    out.push({
      id: `req-${r.id}`,
      type: 'leave',
      raisedBy: r.employeeId,
      raisedOn,
      currentApprover: r.status === 'pending' ? (employee?.managerId ?? 'emp-005') : null,
      status: r.status,
      payload: {
        leaveRequestId: r.id,
        leaveTypeId: r.leaveTypeId,
        startDate: r.startDate,
        endDate: r.endDate,
        days: leaveRequestDays(r),
        halfDayStart: r.halfDayStart,
        halfDayEnd: r.halfDayEnd,
        reason: r.reason,
      },
      decisionComments:
        r.status === 'rejected'
          ? [{ by: employee?.managerId ?? 'emp-005', on: `${addDays(r.startDate, -3)}T11:00:00${IST}`, comment: 'Two consultants already off that week — please move it.', decision: 'rejected' as const }]
          : [],
    });
  });

  attendanceDays
    .filter((d) => d.status === 'pending-regularisation')
    .forEach((d) => {
      const employee = byId.get(d.employeeId);
      out.push({
        id: `req-reg-${d.employeeId}-${d.date}`,
        type: 'regularisation',
        raisedBy: d.employeeId,
        raisedOn: `${addDays(d.date, 1)}T09:45:00${IST}`,
        currentApprover: employee?.managerId ?? 'emp-005',
        status: 'pending',
        payload: {
          attendanceDayId: d.id,
          date: d.date,
          currentStatus: d.status,
          requestedStatus: 'present',
          requestedFirstIn: d.firstIn,
          requestedLastOut: `${d.date}T18:30:00${IST}`,
          reason: pick(makeRng(`reg:${d.employeeId}:${d.date}`), regularisationReasons),
        },
        decisionComments: [],
      });
    });

  // Two profile-change requests, purely to prove the queue is type-agnostic.
  out.push({
    id: 'req-pc-emp-024',
    type: 'profile-change',
    raisedBy: 'emp-024',
    raisedOn: `2026-09-05T16:10:00${IST}`,
    currentApprover: 'emp-005',
    status: 'pending',
    payload: {
      employeeId: 'emp-024',
      field: 'personalPhone',
      from: '+91 98100 11024',
      to: '+91 90045 22881',
      reason: 'Changed number',
    },
    decisionComments: [],
  });
  out.push({
    id: 'req-doc-emp-031',
    type: 'document',
    raisedBy: 'emp-031',
    raisedOn: `2026-09-08T12:02:00${IST}`,
    currentApprover: 'emp-005',
    status: 'pending',
    payload: { documentType: 'employment', fileName: 'address-proof-updated.pdf', reason: 'Address proof for new residence' },
    decisionComments: [],
  });

  // Work from home, on duty, overtime and partial days — the other things
  // section 8 lets a person raise. They ride the same generic Request object.
  const wfh: Array<[string, string, string, string, Request['status']]> = [
    ['emp-008', '2026-09-09', '2026-09-09', 'Waiting for the plumber at home.', 'approved'],
    ['emp-012', '2026-09-09', '2026-09-11', 'Rendering the Al Wasl set — quieter at home.', 'approved'],
    ['emp-023', '2026-09-09', '2026-09-09', 'Client calls all day, no showroom appointments.', 'approved'],
    ['emp-034', '2026-09-08', '2026-09-12', 'Recovering from dengue, able to work.', 'approved'],
    ['emp-010', '2026-09-15', '2026-09-16', 'Mumbai showroom shut for maintenance.', 'pending'],
  ];
  wfh.forEach(([employeeId, startDate, endDate, reason, status], i) => {
    const employee = byId.get(employeeId);
    out.push({
      id: `req-wfh-${employeeId}-${i}`,
      type: 'wfh',
      raisedBy: employeeId,
      raisedOn: `${addDays(startDate, -2)}T10:00:00${IST}`,
      currentApprover: status === 'pending' ? (employee?.managerId ?? 'emp-005') : null,
      status,
      payload: { startDate, endDate, reason },
      decisionComments: [],
    });
  });

  out.push({
    id: 'req-od-emp-030',
    type: 'on-duty',
    raisedBy: 'emp-030',
    raisedOn: `2026-09-08T18:20:00${IST}`,
    currentApprover: 'emp-007',
    status: 'pending',
    payload: { date: '2026-09-08', location: 'Client site — Golf Course Road', reason: 'Full day at the site, no biometric there.' },
    decisionComments: [],
  });

  out.push({
    id: 'req-ot-emp-016',
    type: 'overtime',
    raisedBy: 'emp-016',
    raisedOn: `2026-09-07T20:10:00${IST}`,
    currentApprover: 'emp-003',
    status: 'pending',
    payload: { date: '2026-09-07', hours: 3, reason: 'Edge polishing to finish the Al Wasl island for dispatch.' },
    decisionComments: [],
  });

  out.push({
    id: 'req-pd-emp-028',
    type: 'partial-day',
    raisedBy: 'emp-028',
    raisedOn: `2026-09-09T08:05:00${IST}`,
    currentApprover: 'emp-022',
    status: 'pending',
    payload: { date: '2026-09-09', from: '14:00', to: '18:30', reason: 'Passport appointment in the afternoon.' },
    decisionComments: [],
  });

  out.push({
    id: 'req-ast-emp-013',
    type: 'asset',
    raisedBy: 'emp-013',
    raisedOn: `2026-09-06T11:30:00${IST}`,
    currentApprover: 'emp-005',
    status: 'pending',
    payload: { assetName: 'Second monitor', category: 'other', reason: 'Drafting on one screen is slowing the detailing work.' },
    decisionComments: [],
  });

  out.push({
    id: 'req-ast-emp-031',
    type: 'asset',
    raisedBy: 'emp-031',
    raisedOn: `2026-08-20T09:15:00${IST}`,
    currentApprover: null,
    status: 'approved',
    payload: { assetName: 'Replacement site tool kit', category: 'tool', reason: 'Old kit was damaged on site.' },
    decisionComments: [
      { by: 'emp-005', on: `2026-08-21T10:00:00${IST}`, comment: 'Issued from the store.', decision: 'approved' as const },
    ],
  });

  // Notices from HR. These are not approvals — they sit in the same list
  // because the Inbox is "everything waiting on you", not "everything to sign".
  const notices: Array<[string, string, string, string]> = [
    ['emp-008', 'Acknowledge the attendance policy', 'Attendance & Shift Policy v1.4 is pending your acknowledgement.', '2026-09-01T09:00:00'],
    ['emp-003', 'Team probation review due', 'Nothing is built for probation confirmation yet — this is a reminder only.', '2026-09-08T09:00:00'],
    ['emp-005', 'Nine people have not acknowledged the safety policy', 'Factory Floor Safety v2.2 was published in May.', '2026-09-02T09:00:00'],
  ];
  notices.forEach(([recipient, title, body, on], i) => {
    out.push({
      id: `req-notice-${i}`,
      type: 'hr-notice',
      raisedBy: 'emp-005',
      raisedOn: `${on}${IST}`,
      currentApprover: recipient,
      status: 'pending',
      payload: { title, body, forEmployeeId: recipient },
      decisionComments: [],
    });
  });

  return out.sort((a, b) => b.raisedOn.localeCompare(a.raisedOn));
}

export const requests: Request[] = buildRequests();
