import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { errorHandler } from './http/middleware/error-handler.js';
import { notFoundHandler } from './http/middleware/not-found.js';
import { healthRouter } from './http/routes/health.js';
import { createRequestLogger, type AppLogger } from './lib/logger.js';

export const createApp = (logger: AppLogger): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(createRequestLogger(logger));
  app.use(healthRouter);
  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
};
