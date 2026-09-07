import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { createHttpError } from '../../lib/http-error.js';

const secretHeader = 'x-bridge-secret';

const safeEquals = (a: string, b: string) => {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
};

// Server-to-server auth for the billing-platform bridge: a shared secret header, not the
// app's own JWT scheme, since the caller is another service provisioning a brand-new
// tenant, not a logged-in user.
export const requireBridgeSecret =
  (expectedSecret: string) =>
  (request: Request, _response: Response, next: NextFunction) => {
    const provided = request.header(secretHeader);

    if (!provided || !safeEquals(provided, expectedSecret)) {
      next(createHttpError(401, 'UNAUTHORIZED', 'Missing or invalid bridge secret'));
      return;
    }

    next();
  };
