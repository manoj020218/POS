import type { ZodSchema } from 'zod';

import { createHttpError } from './http-error.js';

export const parseSchema = <T>(schema: ZodSchema<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join('; ');
    throw createHttpError(400, 'VALIDATION_ERROR', message);
  }

  return parsed.data;
};
