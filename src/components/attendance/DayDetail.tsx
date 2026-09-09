'use client';

import { useState } from 'react';
import { AsyncSection, Button, Card, EmptyState, Muted, Small, StatusPill } from '@/components/ui';
import { getDayDetail, raiseRegularisation } from '@/data/attendance';
import { useAsync } from '@/hooks/useAsync';
import { MOCK_TODAY } from '@/lib/clock';
import { formatDate, formatDayName, formatHours, formatTime } from '@/lib/date';
import { attendanceStatusLabels, attendanceStatusTones, punchSourceLabels } from '@/lib/labels';
import type { AttendanceStatus } from '@/lib/types';
import s from './attendance.module.css';

const regularisableTo: AttendanceStatus[] = ['present', 'half-day', 'leave', 'weekly-off'];

export function DayDetail({
  employeeId,
  date,
  canRaise,
}: {
  employeeId: string;
  date: string;
  canRaise: boolean;
}) {
  const { state, reload } = useAsync(() => getDayDetail(employeeId, date), [employeeId, date]);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <Card title={`${formatDayName(date)}, ${formatDate(date)}`} hint="Raw punches as recorded">
      <AsyncSection state={state} reload={reload} loadingRows={2}>
        {(detail) => (
          <>
            {detail.day ? (
              <div className={s.detailGrid}>
                <span className={s.detailKey}>Status</span>
                <span>
                  <StatusPill
                    label={attendanceStatusLabels[detail.day.status]}
                    tone={attendanceStatusTones[detail.day.status]}
                  />
                  {detail.day.wasRegularised ? (
                    <>
                      {' '}
                      <Muted>
                        <Small>regularised</Small>
                      </Muted>
                    </>
                  ) : null}
                </span>
                <span className={s.detailKey}>First in</span>
                <span>{formatTime(detail.day.firstIn)}</span>
                <span className={s.detailKey}>Last out</span>
                <span>{formatTime(detail.day.lastOut)}</span>
                <span className={s.detailKey}>Total hours</span>
                <span>{formatHours(detail.day.totalHours)}</span>
                {detail.holidayName ? (
                  <>
                    <span className={s.detailKey}>Holiday</span>
                    <span>{detail.holidayName}</span>
                  </>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title={date > MOCK_TODAY ? 'This day has not happened yet' : 'No attendance record for this day'}
                body={
                  date > MOCK_TODAY
                    ? 'Future days have no record until they arrive.'
                    : 'Nothing was recorded. If you worked, raise a regularisation.'
                }
              />
            )}

            {detail.punches.length > 0 ? (
              <table className={s.punchTable}>
                <caption className="visually-hidden">Punches on {date}</caption>
                <thead>
                  <tr>
                    <th scope="col">Time</th>
                    <th scope="col">Direction</th>
                    <th scope="col">Source</th>
                    <th scope="col">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.punches.map((p) => (
                    <tr key={p.id}>
                      <td>{formatTime(p.timestamp)}</td>
                      <td>{p.direction === 'in' ? 'In' : 'Out'}</td>
                      <td>{punchSourceLabels[p.source]}</td>
                      <td>{p.location ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ marginTop: 12 }}>
                <Muted>
                  <Small>No punches recorded on this day.</Small>
                </Muted>
              </p>
            )}

            {canRaise && date <= MOCK_TODAY && detail.day?.status !== 'holiday' && detail.day?.status !== 'weekly-off' ? (
              formOpen ? (
                <RegularisationForm
                  employeeId={employeeId}
                  date={date}
                  currentFirstIn={detail.day?.firstIn ?? null}
                  onDone={() => setFormOpen(false)}
                />
              ) : (
                <div className={s.formActions} style={{ marginTop: 16 }}>
                  <Button onClick={() => setFormOpen(true)}>This day looks wrong — request a fix</Button>
                </div>
              )
            ) : null}
          </>
        )}
      </AsyncSection>
    </Card>
  );
}

function RegularisationForm({
  employeeId,
  date,
  currentFirstIn,
  onDone,
}: {
  employeeId: string;
  date: string;
  currentFirstIn: string | null;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [firstIn, setFirstIn] = useState(currentFirstIn ? formatTime(currentFirstIn) : '09:30');
  const [lastOut, setLastOut] = useState('18:30');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (reason.trim().length === 0) {
      setError('A reason is required — the approver has to be able to judge it.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await raiseRegularisation({
        employeeId,
        date,
        requestedStatus: status,
        requestedFirstIn: `${date}T${firstIn}:00+05:30`,
        requestedLastOut: `${date}T${lastOut}:00+05:30`,
        reason: reason.trim(),
      });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.form}>
      <h3>Request a regularisation</h3>
      <div className={s.formRow}>
        <div className={s.field}>
          <label className={s.label} htmlFor="reg-status">
            Should be
          </label>
          <select id="reg-status" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
            {regularisableTo.map((v) => (
              <option key={v} value={v}>
                {attendanceStatusLabels[v]}
              </option>
            ))}
          </select>
        </div>
        <div className={s.field}>
          <label className={s.label} htmlFor="reg-in">
            In time
          </label>
          <input id="reg-in" type="time" value={firstIn} onChange={(e) => setFirstIn(e.target.value)} />
        </div>
        <div className={s.field}>
          <label className={s.label} htmlFor="reg-out">
            Out time
          </label>
          <input id="reg-out" type="time" value={lastOut} onChange={(e) => setLastOut(e.target.value)} />
        </div>
      </div>
      <div className={s.field}>
        <label className={s.label} htmlFor="reg-reason">
          Reason
        </label>
        <textarea
          id="reg-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Left directly from the client site, forgot to punch out."
        />
      </div>
      {error ? <p className={s.formError}>{error}</p> : null}
      <div className={s.formActions}>
        <Button variant="primary" onClick={submit} disabled={busy}>
          {busy ? 'Sending…' : 'Send to my manager'}
        </Button>
        <Button variant="quiet" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
