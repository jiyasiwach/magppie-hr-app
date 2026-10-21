'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The front camera, for selfies. The stream is stopped the moment the caller is
 * done, so the camera light never stays on behind a closed dialog.
 */
export function useCamera(active: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw Object.assign(new Error('This browser cannot open the camera. Use Chrome or Safari on your phone.'), {
            name: 'Unsupported',
          });
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setError(null);
        setReady(true);
      } catch (e) {
        const name = (e as Error).name;
        setError(
          name === 'NotAllowedError'
            ? 'Camera permission was refused. Allow the camera for this site in your browser settings, then try again.'
            : name === 'NotFoundError'
              ? 'No camera was found on this device.'
              : (e as Error).message || 'The camera could not be opened.',
        );
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);

  /** The current frame, at the camera's own resolution. */
  const capture = (): HTMLCanvasElement | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    return canvas;
  };

  return { videoRef, ready: active && ready, error: active ? error : null, capture };
}

/** A small square JPEG from the middle of a frame — enough for HR to recognise the person. */
export function thumbnail(frame: HTMLCanvasElement, size = 160): string {
  const side = Math.min(frame.width, frame.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas
    .getContext('2d')
    ?.drawImage(frame, (frame.width - side) / 2, (frame.height - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.7);
}
