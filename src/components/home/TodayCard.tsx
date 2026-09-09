'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AsyncSection, Dial, StatusPill, Working } from '@/components/ui';
import { IconChevronRight, IconPin } from '@/components/ui/icons';
import { getTodayStatus, punch, workedHours } from '@/data/attendance';
import { getShift } from '@/data/team';
import { useAsync } from '@/hooks/useAsync';
import { formatElapsed, useNow } from '@/hooks/useTicker';
import { MOCK_TODAY, now } from '@/lib/clock';
import { formatDate, formatDayName, formatHours, formatTime } from '@/lib/date';
import { attendanceStatusLabels, attendanceStatusTones, punchSourceLabels } from '@/lib/labels';
import s from './home.module.css';

/**
 * The most important element on the screen, and the one that has to work
 * one-handed on a phone: shift, hours against expected, a large clock control,
 * a live timer, and a separate location-tagged punch.
 */
export function TodayCard({ employeeId }: { employeeId: string }) {
  const at = now();
  const { state, reload } = useAsync(() => getTodayStatus(employeeId, at), [employeeId]);
  const shiftQuery = useAsync(() => getShift(employeeId), [employeeId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [punchNote, setPunchNote] = useState<string | null>(null);
  const nowMs = useNow(1000);

  const act = async (direction: 'in' | 'out') => {
    setBusy(true);
    setError(null);
    try {
      await punch(employeeId, direction, new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const locationPunch = async () => {
    setBusy(true);
    setError(null);
    try {
      await punch(employeeId, 'in', new Date());
      setPunchNote(
        'Punch recorded. Location is not captured in this pass — there is no device permission or geocoding behind it yet.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.today}>
      <AsyncSection state={state} reload={reload} loadingRows={3}>
        {(today) => {
          const shift = shiftQuery.state.status === 'ready' ? shiftQuery.state.data : null;
          const expected = shift?.expectedHours ?? 9;
          const lastIn = [...today.punches].reverse().find((p) => p.direction === 'in');
          const elapsed = today.isPunchedIn && lastIn ? nowMs - Date.parse(lastIn.timestamp) : 0;
          // Recomputed against the current second so the dial and the timer
          // never disagree with each other.
          const hours = workedHours(today.punches, new Date(nowMs));

          return (
            <>
              <div className={s.todayHead}>
                <div className={s.todayDate}>
                  <span className={s.todayDay}>
                    {formatDayName(MOCK_TODAY)}, {formatDate(MOCK_TODAY)}
                  </span>
                  <span className={s.todayMeta}>
                    {shift
                      ? `${shift.name} shift · ${shift.startTime}–${shift.endTime} · ${shift.expectedHours}h expected`
                      : 'Shift not assigned'}
                  </span>
                </div>
                {today.day ? (
                  <StatusPill
                    label={attendanceStatusLabels[today.day.status]}
                    tone={attendanceStatusTones[today.day.status]}
                  />
                ) : (
                  <StatusPill label="No record yet" tone="quiet" />
                )}
              </div>

              <div className={s.todayBody}>
                <div className={s.todayHours}>
                  <Dial
                    value={hours}
                    max={expected}
                    caption="Hours worked today"
                    centre={formatHours(hours)}
                  />
                  <div className={s.todayHoursText}>
                    <span className={s.todayHoursValue}>
                      {formatHours(hours)} of {expected}h
                    </span>
                    <span className={s.todayMeta}>
                      {today.punches.length === 0
                        ? 'No punches recorded today.'
                        : `${today.punches.length} punch${today.punches.length === 1 ? '' : 'es'} · first in ${formatTime(today.punches[0].timestamp)}`}
                    </span>
                  </div>
                </div>

                <div className={`${s.timer} ${today.isPunchedIn ? '' : s.timerIdle}`}>
                  {today.isPunchedIn && lastIn ? (
                    <>
                      <span className={s.timerValue}>{formatElapsed(elapsed)}</span>
                      <span>since you clocked in at {formatTime(lastIn.timestamp)}</span>
                    </>
                  ) : (
                    <span>Not clocked in. The timer starts when you clock in.</span>
                  )}
                </div>

                {error ? <p className={s.error}>{error}</p> : null}
                {punchNote ? <p className={s.todayMeta}>{punchNote}</p> : null}

                <div className={s.clockActions}>
                  <button
                    type="button"
                    className={`${s.clockButton} ${today.isPunchedIn ? s.clockOut : s.clockIn}`}
                    disabled={busy}
                    onClick={() => act(today.isPunchedIn ? 'out' : 'in')}
                  >
                    {busy ? 'Saving…' : today.isPunchedIn ? 'Clock Out' : 'Clock In'}
                  </button>
                  <button type="button" className={s.punchButton} disabled={busy} onClick={locationPunch}>
                    <IconPin size={18} />
                    Punch
                  </button>
                </div>

                <Working summary="How are today's hours worked out?">
                  <ul className={s.punchWorking}>
                    {today.punches.length === 0 ? (
                      <li>No punches yet, so the total is zero.</li>
                    ) : (
                      today.punches.map((p, i) => (
                        <li key={p.id}>
                          {i + 1}. {p.direction === 'in' ? 'In' : 'Out'} at {formatTime(p.timestamp)} (
                          {punchSourceLabels[p.source]}
                          {p.location ? `, ${p.location}` : ''})
                        </li>
                      ))
                    )}
                    <li>
                      Paired in/out spans are added together
                      {today.isPunchedIn ? ', and the open span counts up to now' : ''} —{' '}
                      {formatHours(hours)}.
                    </li>
                    <li>
                      Expected hours come from the {shift?.name ?? 'assigned'} shift. Shift timings are
                      placeholders until real ones are given.
                    </li>
                  </ul>
                </Working>
              </div>

              <div className={s.todayFooter}>
                <span className={s.todayMeta}>Every punch behind today</span>
                <Link href="/attendance" className={s.todayFooterLink}>
                  Open today&rsquo;s attendance
                  <IconChevronRight size={16} />
                </Link>
              </div>
            </>
          );
        }}
      </AsyncSection>
    </div>
  );
}
