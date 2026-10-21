'use client';

import { useEffect, useRef, useState } from 'react';
import { IconCamera, IconCheck, IconClose, IconFace, IconPin } from '@/components/ui/icons';
import { punch } from '@/data/attendance';
import {
  FACE_CONSENT,
  FACE_MATCH_THRESHOLD,
  MAX_TRUSTED_ACCURACY_M,
  getFaceEnrolment,
  getSite,
  registerFace,
} from '@/data/verification';
import { faceDistance, loadFaceModels, readFace } from '@/lib/face';
import { currentPosition, distanceM, formatFix, type Fix } from '@/lib/geo';
import type { FaceEnrolment, PunchVerification } from '@/lib/types';
import { thumbnail, useCamera } from './useCamera';
import s from './verify.module.css';

type Phase = 'locating' | 'location-failed' | 'register' | 'camera' | 'checking' | 'saving' | 'saved';

interface Props {
  employeeId: string;
  firstName: string;
  siteName: string;
  direction: 'in' | 'out';
  /** What the button said: Clock In, Clock Out or Punch. */
  actionLabel: string;
  onClose: () => void;
  onSaved: (summary: string) => void;
}

/**
 * A punch only counts once three things are true, in this order: the phone has
 * given an exact location, a selfie has been taken, and that selfie matches the
 * face this person registered. A far-away location is recorded and flagged for
 * review, never blocked — installers clock in at client sites. A face that does
 * not match is blocked.
 */
export function VerifiedPunchDialog({ employeeId, firstName, siteName, direction, actionLabel, onClose, onSaved }: Props) {
  const [phase, setPhase] = useState<Phase>('locating');
  const [fix, setFix] = useState<Fix | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationFlag, setLocationFlag] = useState<string | null>(null);
  const [siteNote, setSiteNote] = useState<string | null>(null);
  const [siteCheck, setSiteCheck] = useState<{ distance: number | null; radius: number | null }>({ distance: null, radius: null });
  const [enrolment, setEnrolment] = useState<FaceEnrolment | null>(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [faceResult, setFaceResult] = useState<number | null>(null);
  const started = useRef(false);

  const cameraOn = phase === 'register' || phase === 'camera' || phase === 'checking';
  const { videoRef, ready, error: cameraError, capture } = useCamera(cameraOn && !shot);

  const locate = async () => {
    setPhase('locating');
    setLocationError(null);
    try {
      const [position, site, registered] = await Promise.all([
        currentPosition(),
        getSite(siteName),
        getFaceEnrolment(employeeId),
      ]);
      void loadFaceModels().catch(() => undefined); // warm the models while the person reads the screen
      setFix(position);
      let flag: string | null = null;
      if (site.latitude != null && site.longitude != null) {
        const d = distanceM(position, { latitude: site.latitude, longitude: site.longitude });
        setSiteCheck({ distance: d, radius: site.radiusM });
        if (d > site.radiusM) flag = `${formatMetres(d)} from ${site.name} (allowed ${formatMetres(site.radiusM)}).`;
        setSiteNote(null);
      } else {
        setSiteCheck({ distance: null, radius: null });
        setSiteNote(`${site.name} has no map position yet, so the distance was not checked. HR can set it in Settings → Attendance sites.`);
      }
      if (position.accuracyM > MAX_TRUSTED_ACCURACY_M) {
        flag = [flag, `Location accuracy was ±${position.accuracyM} m — too rough to confirm the site.`].filter(Boolean).join(' ');
      }
      setLocationFlag(flag);
      setEnrolment(registered);
      setPhase(registered ? 'camera' : 'register');
    } catch (e) {
      setLocationError((e as Error).message);
      setPhase('location-failed');
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retake = () => {
    setShot(null);
    setFaceError(null);
    setFaceResult(null);
  };

  const doRegister = async () => {
    const frame = capture();
    if (!frame) return;
    setShot(thumbnail(frame, 320));
    setFaceError(null);
    setPhase('checking');
    try {
      const reading = await readFace(frame);
      if (reading.kind !== 'one') {
        setFaceError(faceProblem(reading.kind === 'many' ? reading.count : 0));
        setPhase('register');
        return;
      }
      const saved = await registerFace(employeeId, reading.descriptor);
      setEnrolment(saved);
      setShot(null);
      setMessage(`Face registered. Now take your ${actionLabel.toLowerCase()} photo.`);
      setPhase('camera');
    } catch (e) {
      setFaceError((e as Error).message);
      setPhase('register');
    }
  };

  const doVerify = async () => {
    const frame = capture();
    if (!frame || !fix || !enrolment) return;
    const photo = thumbnail(frame);
    setShot(thumbnail(frame, 320));
    setFaceError(null);
    setMessage(null);
    setPhase('checking');
    try {
      const reading = await readFace(frame);
      if (reading.kind !== 'one') {
        setFaceError(faceProblem(reading.kind === 'many' ? reading.count : 0));
        setPhase('camera');
        return;
      }
      const distance = Number(faceDistance(reading.descriptor, enrolment.descriptor).toFixed(3));
      setFaceResult(distance);
      if (distance > FACE_MATCH_THRESHOLD) {
        setFaceError(
          `This face does not match the face registered for ${firstName}, so the punch was not saved. ` +
            'Try again facing the camera in good light. If it keeps failing, ask HR.',
        );
        setPhase('camera');
        return;
      }
      setPhase('saving');
      const verification: PunchVerification = {
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracyM: fix.accuracyM,
        siteName,
        siteDistanceM: siteCheck.distance,
        siteRadiusM: siteCheck.radius,
        flag: locationFlag,
        faceDistance: distance,
        faceThreshold: FACE_MATCH_THRESHOLD,
        photo,
      };
      await punch(employeeId, direction, new Date(), verification);
      setPhase('saved');
      onSaved(
        `${actionLabel} saved with location ${formatFix(fix)} and a matching face.` +
          (locationFlag ? ` Flagged for review: ${locationFlag}` : ''),
      );
    } catch (e) {
      setFaceError((e as Error).message);
      setPhase('camera');
    }
  };

  const locationState = phase === 'locating' ? 'active' : phase === 'location-failed' ? 'fail' : 'done';
  const faceState =
    phase === 'saved' || phase === 'saving'
      ? 'done'
      : phase === 'register' || phase === 'camera' || phase === 'checking'
        ? faceError
          ? 'fail'
          : 'active'
        : 'idle';

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="verify-title">
      <div className={s.sheet}>
        <div className={s.head}>
          <div>
            <h2 id="verify-title">{actionLabel}</h2>
            <p>Location and face check, then it is saved.</p>
          </div>
          <button type="button" className={s.close} onClick={onClose} aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>

        <ol className={s.steps}>
          <Step
            state={locationState}
            icon={<IconPin size={16} />}
            title="1. Your exact location"
            text={
              phase === 'locating'
                ? 'Getting your location…'
                : fix
                  ? `${formatFix(fix)}${siteCheck.distance != null ? ` · ${formatMetres(siteCheck.distance)} from ${siteName}` : ''}`
                  : locationError ?? ''
            }
          />
          <Step
            state={faceState}
            icon={<IconFace size={16} />}
            title={enrolment || phase === 'camera' ? '2. Face check' : '2. Register your face (once)'}
            text={
              faceState === 'done'
                ? `Matches ${firstName}${faceResult != null ? ` (score ${faceResult} — must be under ${FACE_MATCH_THRESHOLD})` : ''}`
                : phase === 'checking'
                  ? 'Checking the face…'
                  : faceError
                    ? 'Not matched — nothing was saved. See below.'
                    : faceState === 'idle'
                    ? 'After the location'
                    : enrolment
                      ? 'Look straight at the camera'
                      : 'First time on this device: register your face'
            }
          />
          <Step
            state={phase === 'saved' ? 'done' : phase === 'saving' ? 'active' : 'idle'}
            icon={<IconCheck size={16} />}
            title={`3. ${actionLabel} saved`}
            text={phase === 'saved' ? 'Location, selfie and match score are kept with the punch.' : 'When both checks pass'}
          />
        </ol>

        {phase === 'location-failed' ? (
          <div className={s.actions}>
            <p className={`${s.message} ${s.error}`}>{locationError} A punch cannot be saved without your location.</p>
            <button type="button" className={s.primary} onClick={() => void locate()}>
              Try again
            </button>
          </div>
        ) : null}

        {locationFlag && phase !== 'location-failed' ? (
          <p className={s.flag}>
            <strong>Will be flagged for your manager:</strong> {locationFlag} The punch is still saved.
          </p>
        ) : null}
        {siteNote && phase !== 'locating' ? <p className={s.message}>{siteNote}</p> : null}

        {cameraOn ? (
          <>
            <div className={s.camera}>
              {shot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shot} alt="The photo just taken" />
              ) : (
                <video ref={videoRef} playsInline muted aria-label="Camera preview" />
              )}
              {!shot ? <div className={s.oval} aria-hidden /> : null}
              <div className={s.cameraNote}>
                {cameraError
                  ? cameraError
                  : phase === 'checking'
                    ? 'Checking…'
                    : ready || shot
                      ? 'Fit your face inside the oval, in good light'
                      : 'Opening the camera…'}
              </div>
            </div>
            {message ? <p className={s.message}>{message}</p> : null}
            {faceError ? <p className={`${s.message} ${s.error}`}>{faceError}</p> : null}
            {phase === 'register' && !enrolment ? (
              <label className={s.consent}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>{FACE_CONSENT}</span>
              </label>
            ) : null}
            <div className={s.actions}>
              {shot && phase !== 'checking' ? (
                <button type="button" className={s.primary} onClick={retake}>
                  <IconCamera size={18} /> Retake
                </button>
              ) : phase === 'register' ? (
                <button type="button" className={s.primary} disabled={!ready || !consent} onClick={() => void doRegister()}>
                  Register my face
                </button>
              ) : (
                <button type="button" className={s.primary} disabled={!ready || phase === 'checking'} onClick={() => void doVerify()}>
                  {phase === 'checking' ? 'Checking…' : `Take photo and ${actionLabel.toLowerCase()}`}
                </button>
              )}
              <button type="button" className={s.secondary} onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        ) : null}

        {phase === 'saving' ? <p className={s.message}>Saving…</p> : null}
        {phase === 'saved' ? (
          <div className={s.actions}>
            <button type="button" className={s.primary} onClick={onClose}>
              Done
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Step({ state, icon, title, text }: { state: 'idle' | 'active' | 'done' | 'fail'; icon: React.ReactNode; title: string; text: string }) {
  const cls = state === 'active' ? s.stepActive : state === 'done' ? s.stepDone : state === 'fail' ? s.stepFail : '';
  return (
    <li className={`${s.step} ${cls}`}>
      <span className={s.stepIcon}>{state === 'done' ? <IconCheck size={16} /> : icon}</span>
      <span className={s.stepText}>
        <strong>{title}</strong>
        <span>{text}</span>
      </span>
    </li>
  );
}

function faceProblem(count: number): string {
  return count === 0
    ? 'No face was found in that photo. Hold the phone at eye level, in good light, and try again.'
    : `${count} faces were found. Only you should be in the photo — try again.`;
}

function formatMetres(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}
