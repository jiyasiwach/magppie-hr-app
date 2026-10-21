'use client';

import { useState } from 'react';
import { AsyncSection, Button, Card, PageHeader, Small, Stack, StatusPill } from '@/components/ui';
import { thumbnail, useCamera } from '@/components/attendance/useCamera';
import { useCurrentUser } from '@/components/shell/CurrentUserProvider';
import { FACE_CONSENT, getFaceEnrolment, registerFace } from '@/data/verification';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/lib/date';
import { readFace } from '@/lib/face';
import s from '@/components/attendance/verify.module.css';

/** Register or replace the face used to check clock-in selfies. */
export default function FacePage() {
  const { user } = useCurrentUser();
  const id = user.employee.id;
  const { state, reload } = useAsync(() => getFaceEnrolment(id), [id]);
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const { videoRef, ready, error, capture } = useCamera(open && !shot);

  const register = async () => {
    const frame = capture();
    if (!frame) return;
    setShot(thumbnail(frame, 320));
    setBusy(true);
    setNote(null);
    try {
      const reading = await readFace(frame);
      if (reading.kind !== 'one') {
        setNote(
          reading.kind === 'none'
            ? 'No face was found. Hold the phone at eye level, in good light, and try again.'
            : 'More than one face was found. Only you should be in the photo.',
        );
        setShot(null);
        return;
      }
      await registerFace(id, reading.descriptor);
      setOpen(false);
      setShot(null);
      setNote('Registered. Your next clock-in will be checked against this face.');
      reload();
    } catch (e) {
      setNote((e as Error).message);
      setShot(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack>
      <PageHeader
        title="Face for attendance"
        description="Clock In, Clock Out and Punch check a selfie against this face, so nobody can punch for someone else."
      />
      <AsyncSection state={state} reload={reload}>
        {(enrolment) => (
          <Card
            title="Your registered face"
            actions={<StatusPill label={enrolment ? 'Registered' : 'Not registered'} tone={enrolment ? 'success' : 'warning'} />}
          >
            <Stack tight>
              <span>
                {enrolment
                  ? `Registered on ${formatDate(enrolment.enrolledAt.slice(0, 10))}. Re-register if your appearance has changed a lot or checks keep failing.`
                  : 'You have not registered a face yet. You will be asked to the first time you clock in, or you can do it now.'}
              </span>
              {open ? (
                <>
                  <div className={s.camera} style={{ maxWidth: 360 }}>
                    {shot ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shot} alt="The photo just taken" />
                    ) : (
                      <video ref={videoRef} playsInline muted aria-label="Camera preview" />
                    )}
                    {!shot ? <div className={s.oval} aria-hidden /> : null}
                    <div className={s.cameraNote}>{error ?? (busy ? 'Checking…' : ready ? 'Fit your face inside the oval' : 'Opening the camera…')}</div>
                  </div>
                  <label className={s.consent}>
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    <span>{FACE_CONSENT}</span>
                  </label>
                  <div>
                    <Button variant="primary" disabled={!ready || !consent || busy} onClick={() => void register()}>
                      {busy ? 'Checking…' : enrolment ? 'Replace my face' : 'Register my face'}
                    </Button>{' '}
                    <Button variant="quiet" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div>
                  <Button variant="primary" onClick={() => setOpen(true)}>
                    {enrolment ? 'Re-register my face' : 'Register my face'}
                  </Button>
                </div>
              )}
              {note ? <Small>{note}</Small> : null}
              <Small>
                The check runs on this phone. The photo itself is not kept with your registration; a selfie is kept
                with each punch so HR can review it.
              </Small>
            </Stack>
          </Card>
        )}
      </AsyncSection>
    </Stack>
  );
}
