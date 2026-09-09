'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button, Card, LoadingState, PageHeader, Stack } from '@/components/ui';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { submitAttendanceRequest, type AttendanceRequestType } from '@/data/requests';
import { MOCK_TODAY } from '@/lib/clock';
import { requestTypeLabels } from '@/lib/labels';
import s from './request.module.css';

const TYPES: AttendanceRequestType[] = ['wfh', 'on-duty', 'overtime', 'partial-day'];

const blurb: Record<AttendanceRequestType, string> = {
  wfh: 'Working from home for a day or a stretch of days.',
  'on-duty': 'Working away from your usual place — a client site, another location.',
  overtime: 'Hours worked beyond your shift that need recording.',
  'partial-day': 'Away for part of a day, with the rest worked as normal.',
};

function RequestForm() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const params = useSearchParams();
  const initial = (params.get('type') as AttendanceRequestType) ?? 'wfh';

  const [type, setType] = useState<AttendanceRequestType>(
    TYPES.includes(initial) ? initial : 'wfh',
  );
  const [startDate, setStartDate] = useState(MOCK_TODAY);
  const [endDate, setEndDate] = useState(MOCK_TODAY);
  const [date, setDate] = useState(MOCK_TODAY);
  const [location, setLocation] = useState('');
  const [hours, setHours] = useState('2');
  const [from, setFrom] = useState('14:00');
  const [to, setTo] = useState('18:30');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (!reason.trim()) {
      setError('A reason is required — your manager decides on it.');
      return;
    }
    if (type === 'wfh' && endDate < startDate) {
      setError('The end date is before the start date.');
      return;
    }
    if (type === 'on-duty' && !location.trim()) {
      setError('Say where you will be.');
      return;
    }
    if (type === 'partial-day' && to <= from) {
      setError('The end time is not after the start time.');
      return;
    }

    const payload: Record<string, unknown> =
      type === 'wfh'
        ? { startDate, endDate, reason: reason.trim() }
        : type === 'on-duty'
          ? { date, location: location.trim(), reason: reason.trim() }
          : type === 'overtime'
            ? { date, hours: Number(hours), reason: reason.trim() }
            : { date, from, to, reason: reason.trim() };

    setBusy(true);
    try {
      await submitAttendanceRequest(user.employee.id, type, payload);
      setDone(true);
      setReason('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Raise a request"
        description="Goes to your reporting manager and lands in their Inbox."
      />

      <Stack>
        <Card title="What kind of request">
          <div className={s.typeGrid}>
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`${s.typeCard} ${type === t ? s.typeCardActive : ''}`}
                aria-pressed={type === t}
                onClick={() => {
                  setType(t);
                  setDone(false);
                }}
              >
                <span className={s.typeTitle}>{requestTypeLabels[t]}</span>
                <span className={s.typeBody}>{blurb[t]}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title={requestTypeLabels[type]}>
          <div className={s.form}>
            {type === 'wfh' ? (
              <div className={s.row}>
                <Field label="From" id="req-start">
                  <input
                    id="req-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate < e.target.value) setEndDate(e.target.value);
                    }}
                  />
                </Field>
                <Field label="To" id="req-end">
                  <input id="req-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </Field>
              </div>
            ) : (
              <div className={s.row}>
                <Field label="Date" id="req-date">
                  <input id="req-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                {type === 'on-duty' ? (
                  <Field label="Where" id="req-location">
                    <input
                      id="req-location"
                      type="text"
                      value={location}
                      placeholder="Client site, other location"
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </Field>
                ) : null}
                {type === 'overtime' ? (
                  <Field label="Hours" id="req-hours">
                    <input
                      id="req-hours"
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                    />
                  </Field>
                ) : null}
                {type === 'partial-day' ? (
                  <>
                    <Field label="Away from" id="req-from">
                      <input id="req-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </Field>
                    <Field label="Until" id="req-to">
                      <input id="req-to" type="time" value={to} onChange={(e) => setTo(e.target.value)} />
                    </Field>
                  </>
                ) : null}
              </div>
            )}

            <Field label="Reason" id="req-reason">
              <textarea
                id="req-reason"
                value={reason}
                placeholder="Enough for your manager to decide."
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>

            {error ? <p className={s.error}>{error}</p> : null}
            {done ? (
              <p className={s.done}>
                Sent. It is now in your manager&rsquo;s Inbox, and in your Request History.
              </p>
            ) : null}

            <div className={s.actions}>
              <Button variant="primary" onClick={submit} disabled={busy}>
                {busy ? 'Sending…' : 'Send request'}
              </Button>
              <Button variant="quiet" onClick={() => router.push('/requests')}>
                See my requests
              </Button>
            </div>

            <p className={s.note}>
              What an approved request does to an attendance day is not defined — overtime does not add
              hours and a partial day does not shorten the expected day. Flagged, not guessed.
            </p>
          </div>
        </Card>
      </Stack>
    </>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <RequestForm />
    </Suspense>
  );
}
