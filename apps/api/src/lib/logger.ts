import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';
import pino from 'pino';

export type AppLogger = pino.Logger;

export const createLogger = (level: pino.LevelWithSilent = 'info') =>
  pino({
    level,
    base: undefined
  });

export const createRequestLogger = (logger: AppLogger) =>
  (request: Request, response: Response, next: NextFunction) => {
    const requestId = request.headers['x-request-id']?.toString() ?? randomUUID();
    const startedAt = process.hrtime.bigint();

    response.setHeader('x-request-id', requestId);
    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      logger.info(
        {
          durationMs: Number(durationMs.toFixed(2)),
          method: request.method,
          path: request.originalUrl,
          requestId,
          statusCode: response.statusCode
        },
        'Request completed'
      );
    });

    next();
  };
