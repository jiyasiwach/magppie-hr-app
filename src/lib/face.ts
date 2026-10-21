/**
 * Face checks for verified punches, run entirely on the device. The models are
 * served from /public/models and loaded only when someone opens the camera, so
 * no other screen pays for them. No image or face data leaves the browser here.
 *
 * Not done, and flagged: liveness. A printed photo or a phone screen held up to
 * the camera can pass a pure match. Real deployments add a blink/turn challenge
 * or a liveness model — see docs/13, open question 30.
 */
type FaceApi = typeof import('@vladmandic/face-api');

let loading: Promise<FaceApi> | null = null;

export function loadFaceModels(): Promise<FaceApi> {
  if (!loading) {
    loading = (async () => {
      const faceapi = await import('@vladmandic/face-api');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
      return faceapi;
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

export type FaceReading =
  | { kind: 'none' }
  | { kind: 'many'; count: number }
  | { kind: 'one'; descriptor: number[]; score: number };

/** Exactly one face is required: none means retake, more than one means someone else is in shot. */
export async function readFace(image: HTMLCanvasElement): Promise<FaceReading> {
  const faceapi = await loadFaceModels();
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });
  const found = await faceapi.detectAllFaces(image, options).withFaceLandmarks().withFaceDescriptors();
  if (found.length === 0) return { kind: 'none' };
  if (found.length > 1) return { kind: 'many', count: found.length };
  return { kind: 'one', descriptor: Array.from(found[0].descriptor), score: found[0].detection.score };
}

export function faceDistance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}
