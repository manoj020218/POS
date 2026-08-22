import type { ErrorRequestHandler } from 'express';

import type { AppLogger } from '../../lib/logger.js';

type ApiError = {
  code: string;
  message: string;
  statusCode: number;
};

const toApiError = (error: unknown): ApiError => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'statusCode' in error
  ) {
    return {
      code: String(error.code),
      message: String(error.message),
      statusCode: Number(error.statusCode)
    };
  }

  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
    statusCode: 500
  };
};

export const errorHandler =
  (logger: AppLogger): ErrorRequestHandler =>
  (error, request, response, _next) => {
    void _next;

    const apiError = toApiError(error);

    logger.error(
      {
        err: error,
        method: request.method,
        path: request.originalUrl,
        statusCode: apiError.statusCode
      },
      'Request failed'
    );

    response.status(apiError.statusCode).json({
      code: apiError.code,
      message: apiError.message
    });
  };
