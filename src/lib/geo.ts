/**
 * Device location for verified punches. High accuracy and no cached fix: a
 * clock-in must describe where the phone is now, not where it was earlier.
 */
export interface Fix {
  latitude: number;
  longitude: number;
  accuracyM: number;
}

export function currentPosition(timeoutMs = 20000): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('This device cannot share its location, so a verified punch is not possible here.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracyM: Math.round(pos.coords.accuracy),
        }),
      (err) => {
        const why =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was refused. Click the icon at the left of the address bar, allow Location for this site, then try again.'
            : err.code === err.TIMEOUT
              ? 'Getting your location took too long. Step outside or near a window and try again.'
              : 'Your location could not be read. On a Mac, turn on System Settings → Privacy & Security → Location Services for your browser; on a phone, switch on Location. Then try again.';
        reject(new Error(why));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

/** Great-circle distance in metres. */
export function distanceM(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function formatFix(f: Fix): string {
  return `${f.latitude.toFixed(5)}, ${f.longitude.toFixed(5)} (±${f.accuracyM} m)`;
}
