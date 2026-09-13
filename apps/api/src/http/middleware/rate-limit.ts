import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

import { createHttpError } from '../../lib/http-error.js';

// Tests fire many requests at a shared in-memory app instance in quick
// succession by design (that's the whole point of an integration test) —
// a real limiter would fail assertions that have nothing to do with rate
// limiting itself. Disabled only in NODE_ENV=test, never in production.
// Exported so a dedicated rate-limit test can build its own isolated
// instance with this check bypassed, without affecting the shared
// authRateLimiter/apiRateLimiter singletons every other test runs against.
export const createRateLimiter = (
  windowMs: number,
  max: number,
  message: string,
  options: { skipInTest?: boolean } = {}
): RateLimitRequestHandler =>
  rateLimit({
    handler: (_request, _response, next) => {
      next(createHttpError(429, 'RATE_LIMITED', message));
    },
    legacyHeaders: false,
    limit: max,
    skip: () => (options.skipInTest ?? true) && process.env.NODE_ENV === 'test',
    standardHeaders: true,
    windowMs
  });

// Brute-force-sensitive auth endpoints (login, password reset, refresh) get
// a much tighter limit than the general API — these are the endpoints an
// attacker actually gains something from hammering.
export const authRateLimiter = createRateLimiter(
  15 * 60 * 1000,
  20,
  'Too many attempts. Please wait a few minutes and try again.'
);

// Defense-in-depth for the rest of the API — generous enough that normal
// terminal sync/checkout traffic never comes close, but bounds abuse/scraping.
export const apiRateLimiter = createRateLimiter(
  15 * 60 * 1000,
  600,
  'Too many requests. Please slow down and try again shortly.'
);
