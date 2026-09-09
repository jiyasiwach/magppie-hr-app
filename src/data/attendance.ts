import type { AttendanceDay, AttendanceStatus, Holiday, Punch } from '@/lib/types';
import { MOCK_TODAY } from '@/lib/clock';
import { datesBetween, endOfMonth, startOfMonth } from '@/lib/date';
import { read, store, write } from './store';

export interface DayDetail {
  date: string;
  day: AttendanceDay | null;
  punches: Punch[];
  holidayName: string | null;
}

export async function getAttendanceMonth(employeeId: string, month: string): Promise<AttendanceDay[]> {
  return read(() =>
    store.attendanceDays
      .filter((d) => d.employeeId === employeeId && d.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date)),
  );
}

export async function getDayDetail(employeeId: string, date: string): Promise<DayDetail> {
  return read(() => ({
    date,
    day: store.attendanceDays.find((d) => d.employeeId === employeeId && d.date === date) ?? null,
    punches: store.punches
      .filter((p) => p.employeeId === employeeId && p.timestamp.slice(0, 10) === date)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    holidayName: store.holidays.find((h) => h.date === date)?.name ?? null,
  }));
}

export interface TodayStatus {
  date: string;
  punches: Punch[];
  isPunchedIn: boolean;
  hoursSoFar: number;
  day: AttendanceDay | null;
}

/**
 * Paired in/out spans, plus the open span counted up to `upto`. Exported so a
 * live display can recompute against the current second rather than showing a
 * number from whenever the data was fetched.
 */
export function workedHours(punches: Punch[], upto: Date): number {
  let total = 0;
  let openedAt: number | null = null;
  punches.forEach((p) => {
    const t = new Date(p.timestamp).getTime();
    if (p.direction === 'in') {
      openedAt = t;
    } else if (openedAt !== null) {
      total += t - openedAt;
      openedAt = null;
    }
  });
  if (openedAt !== null) total += upto.getTime() - openedAt;
  return Math.max(0, Math.round((total / 3_600_000) * 100) / 100);
}

export async function getTodayStatus(employeeId: string, at: Date): Promise<TodayStatus> {
  return read(() => {
    const punches = store.punches
      .filter((p) => p.employeeId === employeeId && p.timestamp.slice(0, 10) === MOCK_TODAY)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const last = punches[punches.length - 1];
    return {
      date: MOCK_TODAY,
      punches,
      isPunchedIn: last?.direction === 'in',
      hoursSoFar: workedHours(punches, at),
      day: store.attendanceDays.find((d) => d.employeeId === employeeId && d.date === MOCK_TODAY) ?? null,
    };
  });
}

export async function punch(employeeId: string, direction: 'in' | 'out', at: Date): Promise<void> {
  await write(() => {
    const timestamp = at.toISOString();
    store.punches.push({
      id: `pn-${employeeId}-${MOCK_TODAY}-manual-${store.punches.length}`,
      employeeId,
      timestamp,
      direction,
      source: 'web',
      location: null,
    });
    const dayPunches = store.punches
      .filter((p) => p.employeeId === employeeId && p.timestamp.slice(0, 10) === MOCK_TODAY)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const existing = store.attendanceDays.find((d) => d.employeeId === employeeId && d.date === MOCK_TODAY);
    const firstIn = dayPunches.find((p) => p.direction === 'in')?.timestamp ?? null;
    const lastOut = [...dayPunches].reverse().find((p) => p.direction === 'out')?.timestamp ?? null;
    const totalHours = workedHours(dayPunches, at);
    if (existing) {
      existing.firstIn = firstIn;
      existing.lastOut = lastOut;
      existing.totalHours = totalHours;
      existing.status = 'present';
    } else {
      store.attendanceDays.push({
        id: `ad-${employeeId}-${MOCK_TODAY}`,
        employeeId,
        date: MOCK_TODAY,
        status: 'present',
        firstIn,
        lastOut,
        totalHours,
        wasRegularised: false,
      });
    }
  });
}

export interface MonthSummary {
  month: string;
  counts: Record<AttendanceStatus, number>;
  totalHours: number;
  workingDays: number;
  daysWithRecords: number;
  daysWithoutRecords: string[];
}

/** Returned alongside the number so the screen can show how it was worked out. */
export async function getMonthSummary(employeeId: string, month: string): Promise<MonthSummary> {
  return read(() => {
    const days = store.attendanceDays.filter((d) => d.employeeId === employeeId && d.date.startsWith(month));
    const counts: Record<AttendanceStatus, number> = {
      present: 0,
      absent: 0,
      'half-day': 0,
      leave: 0,
      holiday: 0,
      'weekly-off': 0,
      'pending-regularisation': 0,
    };
    days.forEach((d) => {
      counts[d.status] += 1;
    });
    const allDates = datesBetween(startOfMonth(`${month}-01`), endOfMonth(`${month}-01`)).filter(
      (d) => d <= MOCK_TODAY,
    );
    const recorded = new Set(days.map((d) => d.date));
    return {
      month,
      counts,
      totalHours: Math.round(days.reduce((sum, d) => sum + d.totalHours, 0) * 100) / 100,
      workingDays: counts.present + counts['half-day'] + counts['pending-regularisation'],
      daysWithRecords: days.length,
      daysWithoutRecords: allDates.filter((d) => !recorded.has(d)),
    };
  });
}

export async function raiseRegularisation(input: {
  employeeId: string;
  date: string;
  requestedStatus: AttendanceStatus;
  requestedFirstIn: string | null;
  requestedLastOut: string | null;
  reason: string;
}): Promise<void> {
  await write(() => {
    const employee = store.employees.find((e) => e.id === input.employeeId);
    const day = store.attendanceDays.find((d) => d.employeeId === input.employeeId && d.date === input.date);
    store.requests.unshift({
      id: `req-reg-${input.employeeId}-${input.date}-${Date.now()}`,
      type: 'regularisation',
      raisedBy: input.employeeId,
      raisedOn: new Date().toISOString(),
      currentApprover: employee?.managerId ?? 'emp-005',
      status: 'pending',
      payload: {
        attendanceDayId: day?.id ?? null,
        date: input.date,
        currentStatus: day?.status ?? 'absent',
        requestedStatus: input.requestedStatus,
        requestedFirstIn: input.requestedFirstIn,
        requestedLastOut: input.requestedLastOut,
        reason: input.reason,
      },
      decisionComments: [],
    });
    if (day) day.status = 'pending-regularisation';
  });
}

export async function getTeamAttendanceForDate(employeeIds: string[], date: string): Promise<AttendanceDay[]> {
  return read(() =>
    store.attendanceDays.filter((d) => d.date === date && employeeIds.includes(d.employeeId)),
  );
}

/** 13.12 Holidays from today forward, for the Home strip and the Time tab. */
export async function getUpcomingHolidays(limit?: number): Promise<Holiday[]> {
  return read(() => {
    const upcoming = store.holidays
      .filter((h) => h.date >= MOCK_TODAY)
      .sort((a, b) => a.date.localeCompare(b.date));
    return limit ? upcoming.slice(0, limit) : upcoming;
  });
}
