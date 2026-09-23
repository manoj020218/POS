import { createHttpError } from '../../lib/http-error.js';
import type { AuthRepository } from './auth.repository.js';
import type { OwnProfileView, UpdateOwnProfileInput } from './auth.types.js';

// Deliberately no permission check beyond being authenticated -- unlike
// updateUser (which needs user:manage to edit someone ELSE), any signed-in
// user can rename themselves. This is what backs the cashier-name editor
// in the top bar, not admin-side user management.
export const createUpdateOwnProfileHandler =
  (repository: AuthRepository) =>
  async (input: UpdateOwnProfileInput): Promise<OwnProfileView> => {
    const user = await repository.findUserById(input.userId);

    if (!user || user.tenantId !== input.tenantId) {
      throw createHttpError(404, 'AUTH_USER_NOT_FOUND', 'User not found');
    }

    const updated = await repository.upsertUser({ ...user, displayName: input.displayName });

    return { displayName: updated.displayName };
  };
