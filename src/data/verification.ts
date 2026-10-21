/**
 * Face registration and attendance sites — the data behind verified punches.
 *
 * MOCK-ONLY PERSISTENCE: the rest of the mock store resets on reload, but a
 * registered face and a site's position are kept in this browser's
 * localStorage so the clock-in flow can be tried more than once. With the real
 * backend these become two tables (`face_enrolments`, `attendance_sites`) with
 * row-level security; a face descriptor is biometric personal data and must
 * never be readable by anyone but the system that checks it.
 */
import type { AttendanceSite, FaceEnrolment } from '@/lib/types';
import { locations } from '@/mocks';
import { read, write } from './store';

/**
 * FLAGGED: how close a selfie must be to the registered face. 0.5 is a common
 * setting for this model (lower is stricter). It has not been tuned on real
 * Magppie staff, phones or lighting — see docs/13, open question 28.
 */
export const FACE_MATCH_THRESHOLD = 0.5;

/**
 * FLAGGED: how far from a site a punch may be before it is flagged for review.
 * Never given by HR — see docs/13, open question 29. A flag never blocks the
 * punch: installers legitimately clock in at client sites.
 */
export const DEFAULT_SITE_RADIUS_M = 200;

/** Readings rougher than this cannot say which building someone is in. */
export const MAX_TRUSTED_ACCURACY_M = 100;

export const FACE_CONSENT =
  'I agree that a description of my face is stored and used only to confirm it is me when I clock in or punch. ' +
  'The photo itself is not kept with my registration, and I can ask HR to delete it.';

const faceKey = (employeeId: string) => `hr.face.${employeeId}`;
const SITES_KEY = 'hr.sites';

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error('This browser would not save the registration. Private browsing can block it.');
  }
}

export async function getFaceEnrolment(employeeId: string): Promise<FaceEnrolment | null> {
  return read(() => load<FaceEnrolment | null>(faceKey(employeeId), null));
}

export async function registerFace(employeeId: string, descriptor: number[]): Promise<FaceEnrolment> {
  return write(() => {
    if (descriptor.length !== 128) throw new Error('That photo did not produce a usable face description. Try again.');
    const enrolment: FaceEnrolment = {
      employeeId,
      descriptor,
      enrolledAt: new Date().toISOString(),
      consent: FACE_CONSENT,
    };
    save(faceKey(employeeId), enrolment);
    return enrolment;
  });
}

type SavedSites = Record<string, Omit<AttendanceSite, 'name'>>;

export async function getSites(): Promise<AttendanceSite[]> {
  return read(() => {
    const saved = load<SavedSites>(SITES_KEY, {});
    return locations.map((name) => ({
      name,
      latitude: saved[name]?.latitude ?? null,
      longitude: saved[name]?.longitude ?? null,
      radiusM: saved[name]?.radiusM ?? DEFAULT_SITE_RADIUS_M,
      setBy: saved[name]?.setBy ?? null,
      setAt: saved[name]?.setAt ?? null,
    }));
  });
}

export async function getSite(name: string): Promise<AttendanceSite> {
  const all = await getSites();
  return (
    all.find((s) => s.name === name) ?? {
      name,
      latitude: null,
      longitude: null,
      radiusM: DEFAULT_SITE_RADIUS_M,
      setBy: null,
      setAt: null,
    }
  );
}

/** HR stands at the site and records its position from their own phone. */
export async function setSitePosition(
  name: string,
  position: { latitude: number; longitude: number },
  radiusM: number,
  setBy: string,
): Promise<void> {
  await write(() => {
    if (!locations.includes(name)) throw new Error(`Unknown site: ${name}`);
    if (!(radiusM >= 50 && radiusM <= 5000)) throw new Error('The allowed distance must be between 50 m and 5 km.');
    const saved = load<SavedSites>(SITES_KEY, {});
    saved[name] = { ...position, radiusM, setBy, setAt: new Date().toISOString() };
    save(SITES_KEY, saved);
  });
}
