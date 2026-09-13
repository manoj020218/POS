import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export type CapturedPhoto = { blob: Blob; webPath: string };

/**
 * Opens the native camera or gallery picker and returns both a local
 * (immediately displayable) preview path and the image bytes ready to
 * upload. Resolves to null if the picker returned no usable path; rejects
 * if the user cancels or the platform denies the request (callers should
 * treat cancellation as a no-op, not an error).
 */
export const capturePhoto = async (source: 'camera' | 'gallery'): Promise<CapturedPhoto | null> => {
  const photo = await Camera.getPhoto({
    // Product photos are shown as small thumbnails/cards, never full-screen —
    // the native picker downscales before the image ever reaches JS, which is
    // far cheaper than capturing full camera resolution and resizing after.
    quality: 65,
    resultType: CameraResultType.Uri,
    source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
    width: 640
  });

  if (!photo.webPath) {
    return null;
  }

  const response = await fetch(photo.webPath);
  const blob = await response.blob();
  return { blob, webPath: photo.webPath };
};
