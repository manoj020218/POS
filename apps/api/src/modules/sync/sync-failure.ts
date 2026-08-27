import type { HttpError } from '../../lib/http-error.js';
import type { SyncEventFailure } from './sync.types.js';

export const toSyncEventFailure = (
  error: unknown,
  failedAt = new Date()
): SyncEventFailure => {
  if (isHttpError(error)) {
    return {
      code: error.code,
      failedAt,
      message: truncateMessage(error.message),
      statusCode: error.statusCode
    };
  }

  if (error instanceof Error && error.message.trim()) {
    return {
      code: 'INTERNAL_SERVER_ERROR',
      failedAt,
      message: truncateMessage(error.message),
      statusCode: 500
    };
  }

  return {
    code: 'INTERNAL_SERVER_ERROR',
    failedAt,
    message: 'Internal server error',
    statusCode: 500
  };
};

const isHttpError = (error: unknown): error is HttpError =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  'message' in error &&
  'statusCode' in error;

const truncateMessage = (message: string) => message.trim().slice(0, 500);
