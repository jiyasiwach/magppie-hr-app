'use client';

import { useState } from 'react';
import { AsyncSection, Button, Card } from '@/components/ui';
import { getLeaveTypes, leaveDays, submitLeaveRequest } from '@/data/leave';
import { useAsync } from '@/hooks/useAsync';
import { MOCK_TODAY } from '@/lib/clock';
import s from './leave.module.css';

export function LeaveRequestForm({ employeeId }: { employeeId: string }) {
  const { state, reload } = useAsync(() => getLeaveTypes(), []);
  const [leaveTypeId, setLeaveTypeId] = useState('lt-casual');
  const [startDate, setStartDate] = useState(MOCK_TODAY);
  const [endDate, setEndDate] = useState(MOCK_TODAY);
  const [halfDayStart, setHalfDayStart] = useState(false);
  const [halfDayEnd, setHalfDayEnd] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (endDate < startDate) {
      setError('The end date is before the start date.');
      return;
    }
    if (reason.trim().length === 0) {
      setError('A reason is required — your manager decides on it.');
      return;
    }
    setBusy(true);
    try {
      await submitLeaveRequest({
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        halfDayStart,
        halfDayEnd,
        reason: reason.trim(),
      });
      setDone(true);
      setReason('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const days = leaveDays({ startDate, endDate, halfDayStart, halfDayEnd });

  return (
    <Card title="Apply for leave">
      <AsyncSection state={state} reload={reload} loadingRows={3}>
        {(types) => {
          const selected = types.find((t) => t.id === leaveTypeId);
          return (
            <div className={s.form}>
              <div className={s.formRow}>
                <div className={s.field}>
                  <label className={s.label} htmlFor="leave-type">
                    Leave type
                  </label>
                  <select
                    id="leave-type"
                    value={leaveTypeId}
                    onChange={(e) => {
                      setLeaveTypeId(e.target.value);
                      setHalfDayStart(false);
                      setHalfDayEnd(false);
                    }}
                  >
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={s.field}>
                  <label className={s.label} htmlFor="leave-start">
                    From
                  </label>
                  <input
                    id="leave-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate < e.target.value) setEndDate(e.target.value);
                    }}
                  />
                </div>
                <div className={s.field}>
                  <label className={s.label} htmlFor="leave-end">
                    To
                  </label>
                  <input id="leave-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              {selected?.halfDaysAllowed ? (
                <div className={s.checkboxRow}>
                  <label className={s.checkbox}>
                    <input
                      type="checkbox"
                      checked={halfDayStart}
                      onChange={(e) => setHalfDayStart(e.target.checked)}
                    />
                    Half day on the first day
                  </label>
                  <label className={s.checkbox}>
                    <input
                      type="checkbox"
                      checked={halfDayEnd}
                      disabled={startDate === endDate}
                      onChange={(e) => setHalfDayEnd(e.target.checked)}
                    />
                    Half day on the last day
                  </label>
                </div>
              ) : (
                <p className={s.preview}>{selected?.name} is applied in full days only.</p>
              )}

              <div className={s.field}>
                <label className={s.label} htmlFor="leave-reason">
                  Reason
                </label>
                <textarea
                  id="leave-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enough for your manager to decide."
                />
              </div>

              <p className={s.preview}>
                This request is <strong>{days}</strong> day{days === 1 ? '' : 's'}, counted as calendar
                days between the two dates minus any half days.{' '}
                <em>
                  Holidays and weekly offs inside a leave range are still counted — nobody has stated
                  whether they should be.
                </em>
              </p>

              {error ? <p className={s.formError}>{error}</p> : null}
              {done ? <p className={s.preview}>Sent. It is now in your manager&rsquo;s approvals queue.</p> : null}

              <div className={s.formActions}>
                <Button variant="primary" onClick={submit} disabled={busy}>
                  {busy ? 'Sending…' : 'Send request'}
                </Button>
              </div>
            </div>
          );
        }}
      </AsyncSection>
    </Card>
  );
}
