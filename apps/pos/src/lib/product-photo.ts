import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export type CapturedPhoto = { blob: Blob; previewUrl: string };

const maxPhotoDimension = 320;
const webpQuality = 0.6;
const jpegQuality = 0.65;

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

const loadImage = (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const sourceUrl = URL.createObjectURL(blob);

    image.onload = () => {
      URL.revokeObjectURL(sourceUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error('Could not read the selected image'));
    };
    image.src = sourceUrl;
  });

/** Downsizes and re-encodes a camera/gallery image before it is previewed or uploaded. */
export const compressProductPhoto = async (source: Blob): Promise<Blob> => {
  const image = await loadImage(source);
  const scale = Math.min(1, maxPhotoDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Image compression is not available on this device');
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  // WebP is normally much smaller for product thumbnails. Older WebViews can
  // silently fall back to PNG, so explicitly retry as JPEG in that case.
  const webp = await canvasToBlob(canvas, 'image/webp', webpQuality);
  if (webp?.type === 'image/webp') {
    return webp;
  }

  const jpeg = await canvasToBlob(canvas, 'image/jpeg', jpegQuality);
  if (!jpeg) {
    throw new Error('Could not compress the selected image');
  }
  return jpeg;
};

export const productPhotoFilename = (photo: Blob): string =>
  `product-${Date.now()}.${photo.type === 'image/webp' ? 'webp' : 'jpg'}`;

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
  if (!response.ok) {
    throw new Error('Could not read the selected image');
  }

  const blob = await compressProductPhoto(await response.blob());
  return { blob, previewUrl: URL.createObjectURL(blob) };
};
