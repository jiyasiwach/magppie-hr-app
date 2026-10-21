'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { getTodayStatus, punch } from '@/data/attendance';
import { effectiveNow, now } from '@/lib/clock';
import type { PunchVerification } from '@/lib/types';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { MOCK_TODAY } from '@/lib/clock';
import { mockPersonas } from '@/lib/auth';
import { APP_NAME } from '@/lib/constants';
import { employees } from '@/mocks';
import { VerifiedPunchDialog } from './VerifiedPunchDialog';
import s from './verify.module.css';

/**
 * Nothing opens until the person on the phone has proved where they are and
 * who they are: exact location first, then a selfie that matches their
 * registered face (registered here the first time). Once per person per
 * browser session; Clock In, Clock Out and Punch still check again.
 *
 * MOCK: the "verified" mark lives in sessionStorage. With real sign-in this
 * becomes part of the session, issued only after the same two checks.
 */
export function VerifyGate({ children }: { children: ReactNode }) {
  const { user, switchUser } = useCurrentUser();
  const key = `hr.verified.${user.employee.id}.${MOCK_TODAY}`;
  const [, rerender] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [evidence, setEvidence] = useState<PunchVerification | null>(null);
  const [punchedIn, setPunchedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verified = readFlag(key);

  // "Lock app" anywhere in the shell clears the mark and brings this screen back.
  useEffect(() => {
    const onLock = () => {
      setEvidence(null);
      setAttempt((n) => n + 1);
    };
    window.addEventListener(LOCK_EVENT, onLock);
    return () => window.removeEventListener(LOCK_EVENT, onLock);
  }, []);

  const open = () => {
    setEvidence(null);
    rerender((n) => n + 1);
  };
  /** Clock in with the location and face just verified — no second selfie. */
  const clockIn = async () => {
    if (!evidence) return;
    setBusy(true);
    setError(null);
    try {
      await punch(user.employee.id, 'in', effectiveNow(Date.now()), evidence);
      open();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Just verified on this screen: stay here until the person picks Clock In or Open.
  if (verified && !evidence) return <>{children}</>;

  return (
    <VerifiedPunchDialog
      key={`${user.employee.id}-${attempt}`}
      gate
      employeeId={user.employee.id}
      firstName={user.employee.fullName.split(' ')[0]}
      siteName={user.employee.location}
      direction="in"
      actionLabel="Verify it's you"
      confirmLabel="Take photo and continue"
      doneTitle="App unlocked"
      onSaved={() => undefined}
      onVerified={async (v) => {
        const today = await getTodayStatus(user.employee.id, now());
        setPunchedIn(today.isPunchedIn);
        setEvidence(v);
        writeFlag(key);
      }}
      doneActions={
        <>
          {punchedIn === false ? (
            <button type="button" className={s.primary} disabled={busy} onClick={() => void clockIn()}>
              {busy ? 'Clocking in…' : 'Clock In now'}
            </button>
          ) : null}
          <button type="button" className={punchedIn === false ? s.secondary : s.primary} onClick={open}>
            {punchedIn === false ? 'Open the app without clocking in' : 'Open the app'}
          </button>
          {error ? <p className={`${s.message} ${s.error}`}>{error}</p> : null}
        </>
      }
      onClose={() => {
        if (readFlag(key)) rerender((n) => n + 1);
        else setAttempt((n) => n + 1);
      }}
      extra={
        <>
          <div className={s.gateBrand}>{APP_NAME}</div>
          <label className={s.gateSwitch}>
            Demo only — who is holding the phone:
            <select value={user.employee.id} onChange={(e) => switchUser(e.target.value)}>
              {mockPersonas.map((p) => (
                <option key={p.employeeId} value={p.employeeId}>
                  {p.label} — {employees.find((e) => e.id === p.employeeId)?.fullName ?? p.employeeId}
                </option>
              ))}
            </select>
          </label>
        </>
      }
    />
  );
}

function readFlag(key: string): boolean {
  try {
    return typeof window !== 'undefined' && window.sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  try {
    window.sessionStorage.setItem(key, '1');
  } catch {
    // A browser that blocks session storage asks again on the next screen — safe, just slower.
  }
}

const LOCK_EVENT = 'hr:lock';

/** Mock sign-out: forget today's verification for this person and show the verify screen again. */
export function lockApp(employeeId: string): void {
  try {
    window.sessionStorage.removeItem(`hr.verified.${employeeId}.${MOCK_TODAY}`);
  } catch {
    // nothing stored, nothing to clear
  }
  window.dispatchEvent(new Event(LOCK_EVENT));
}
