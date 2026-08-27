import { z } from 'zod';

const uuidSchema = z.string().uuid();
const identifierSchema = z.string().trim().min(1).max(128);
const eventTypeSchema = z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,63}$/);
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema)
  ])
);

export const syncPushSchema = z.object({
  events: z
    .array(
      z.object({
        branchId: uuidSchema,
        createdAt: z.coerce.date(),
        deviceId: identifierSchema,
        entityId: identifierSchema,
        eventId: identifierSchema,
        payload: z.record(z.string(), jsonValueSchema),
        type: eventTypeSchema
      })
    )
    .min(1)
    .max(100)
});
