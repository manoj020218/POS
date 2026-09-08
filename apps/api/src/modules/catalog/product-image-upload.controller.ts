import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { RequestHandler } from 'express';
import multer, { MulterError } from 'multer';

import { createHttpError } from '../../lib/http-error.js';

export type ProductImageUploadConfig = {
  publicBaseUrl?: string;
  uploadDir: string;
};

const allowedMimeTypeExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const maxFileSizeBytes = 5 * 1024 * 1024;

export const createProductImageUploadController = (config: ProductImageUploadConfig): RequestHandler => {
  const upload = multer({ limits: { fileSize: maxFileSizeBytes }, storage: multer.memoryStorage() }).single(
    'image'
  );

  return (request, response, next) => {
    upload(request, response, (uploadError: unknown) => {
      void handleUpload(config, request.file, uploadError, response, next);
    });
  };
};

const handleUpload = async (
  config: ProductImageUploadConfig,
  file: Express.Multer.File | undefined,
  uploadError: unknown,
  response: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2]
) => {
  if (uploadError instanceof MulterError) {
    next(createHttpError(400, 'INVALID_IMAGE_UPLOAD', uploadError.message));
    return;
  }
  if (uploadError) {
    next(uploadError);
    return;
  }
  if (!file) {
    next(createHttpError(400, 'IMAGE_FILE_REQUIRED', 'An image file is required'));
    return;
  }

  const extension = allowedMimeTypeExtensions[file.mimetype];
  if (!extension) {
    next(
      createHttpError(400, 'UNSUPPORTED_IMAGE_TYPE', 'Only JPEG, PNG, or WEBP images are supported')
    );
    return;
  }

  if (!config.publicBaseUrl) {
    next(createHttpError(503, 'IMAGE_UPLOAD_NOT_CONFIGURED', 'Image hosting is not configured'));
    return;
  }

  try {
    await mkdir(config.uploadDir, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    await writeFile(path.join(config.uploadDir, filename), file.buffer);
    response
      .status(201)
      .json({ data: { url: `${config.publicBaseUrl}/api/uploads/products/${filename}` } });
  } catch (error) {
    next(error);
  }
};
