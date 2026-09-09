'use client';

import { useState } from 'react';
import { AsyncSection, Button, Card, Muted, Small, StatusPill, Working } from '@/components/ui';
import { getTodayStatus, punch } from '@/data/attendance';
import { useAsync } from '@/hooks/useAsync';
import { now } from '@/lib/clock';
import { formatDate, formatDayName, formatHours, formatTime } from '@/lib/date';
import { attendanceStatusLabels, attendanceStatusTones, punchSourceLabels } from '@/lib/labels';
import s from './attendance.module.css';

/**
 * One large control, usable one-handed. Showroom, site and factory staff punch
 * from a phone, so this is the first thing on the screen and the button is the
 * full width of it.
 */
export function PunchControl({ employeeId }: { employeeId: string }) {
  const at = now();
  const { state, reload } = useAsync(() => getTodayStatus(employeeId, at), [employeeId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doPunch = async (direction: 'in' | 'out') => {
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

  return (
    <Card title="Today" hint={`${formatDayName(at.toISOString().slice(0, 10))}, ${formatDate(at.toISOString().slice(0, 10))}`}>
      <AsyncSection state={state} reload={reload} loadingRows={2}>
        {(today) => (
          <div className={s.punch}>
            <div className={s.punchTop}>
              <div className={s.punchStatus}>
                <span className={s.punchStatusValue}>
                  {today.isPunchedIn ? 'Punched in' : today.punches.length === 0 ? 'Not punched in yet' : 'Punched out'}
                </span>
                <span className={s.punchMeta}>
                  {today.punches.length === 0
                    ? 'No punches recorded today.'
                    : `First in ${formatTime(today.punches[0].timestamp)} · ${today.punches.length} punch${today.punches.length === 1 ? '' : 'es'}`}
                </span>
              </div>
              <div className={s.punchStatus}>
                <span className={`${s.punchStatusValue} ${s.punchHours}`}>{formatHours(today.hoursSoFar)}</span>
                <span className={s.punchMeta}>Total so far today</span>
              </div>
            </div>

            {error ? <p className={s.formError}>{error}</p> : null}

            <Button
              large
              variant="primary"
              disabled={busy}
              onClick={() => doPunch(today.isPunchedIn ? 'out' : 'in')}
            >
              {busy ? 'Saving…' : today.isPunchedIn ? 'Punch out' : 'Punch in'}
            </Button>

            {today.punches.length > 0 ? (
              <ul className={s.punchList}>
                {today.punches.map((p) => (
                  <li key={p.id} className={s.punchChip}>
                    {p.direction === 'in' ? 'In' : 'Out'} {formatTime(p.timestamp)}{' '}
                    <Muted>
                      <Small>{punchSourceLabels[p.source]}</Small>
                    </Muted>
                  </li>
                ))}
              </ul>
            ) : null}

            {today.day ? (
              <div>
                <StatusPill
                  label={`Recorded as ${attendanceStatusLabels[today.day.status].toLowerCase()}`}
                  tone={attendanceStatusTones[today.day.status]}
                />
              </div>
            ) : null}

            <Working summary="How is today’s total worked out?">
              <ul className={s.summaryList}>
                {today.punches.length === 0 ? (
                  <li>
                    <span>No punches yet</span>
                    <span>0h 00m</span>
                  </li>
                ) : (
                  today.punches.map((p, i) => (
                    <li key={p.id}>
                      <span>
                        {i + 1}. {p.direction === 'in' ? 'In' : 'Out'} at {formatTime(p.timestamp)} (
                        {punchSourceLabels[p.source]}
                        {p.location ? `, ${p.location}` : ''})
                      </span>
                      <span />
                    </li>
                  ))
                )}
                <li>
                  <span>
                    Paired in/out spans{today.isPunchedIn ? `, plus the open span counted up to now` : ''}
                  </span>
                  <span>{formatHours(today.hoursSoFar)}</span>
                </li>
              </ul>
            </Working>
          </div>
        )}
      </AsyncSection>
    </Card>
  );
}
