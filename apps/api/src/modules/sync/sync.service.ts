import { createHttpError } from '../../lib/http-error.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import { assertBranchAccess } from '../tenant-core/branch-scope.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { assertSyncEventMatches } from './sync-event-signature.js';
import { SyncEventConflictError, type SyncRepository } from './sync.repository.js';
import type {
  CreateSyncEventInput,
  SyncPushRequest,
  SyncPushResult
} from './sync.types.js';

export const createSyncService = (
  repository: SyncRepository,
  tenantCoreRepository: TenantCoreRepository
) => ({
  pushEvents: async (context: AccessContext, input: SyncPushRequest): Promise<SyncPushResult> => {
    const events = input.events.map(toCreateSyncEventInput(context.tenantId));
    assertRequestEventConsistency(events);
    await assertAccessibleBranches(context, tenantCoreRepository, events);

    try {
      const results = await repository.createReceivedEvents(events);
      return {
        acceptedCount: results.filter((item) => item.result === 'accepted').length,
        duplicateCount: results.filter((item) => item.result === 'duplicate').length,
        events: results.map(({ event, result }) => ({
          branchId: event.branchId,
          entityId: event.entityId,
          eventId: event.eventId,
          receivedAt: event.receivedAt.toISOString(),
          result,
          state: event.state,
          type: event.type
        }))
      };
    } catch (error) {
      if (error instanceof SyncEventConflictError) {
        throw createHttpError(
          409,
          'SYNC_EVENT_CONFLICT',
          `Sync event ${error.eventId} conflicts with a previously received event`
        );
      }

      throw error;
    }
  }
});

const assertAccessibleBranches = async (
  context: AccessContext,
  repository: TenantCoreRepository,
  events: CreateSyncEventInput[]
) => {
  const branches = await repository.listBranches(context.tenantId);
  const branchIds = new Set(branches.map((branch) => branch.id));

  events.forEach((event) => {
    if (!branchIds.has(event.branchId)) {
      throw createHttpError(404, 'BRANCH_NOT_FOUND', 'Branch not found');
    }
    assertBranchAccess(context, event.branchId);
  });
};

const assertRequestEventConsistency = (events: CreateSyncEventInput[]) => {
  const seen = new Map<string, CreateSyncEventInput>();

  events.forEach((event) => {
    const existing = seen.get(event.eventId);
    if (existing) {
      assertSyncEventMatches(existing, event, event.eventId);
      return;
    }

    seen.set(event.eventId, event);
  });
};

const toCreateSyncEventInput =
  (tenantId: string) =>
  (event: SyncPushRequest['events'][number]): CreateSyncEventInput => ({
    branchId: event.branchId,
    deviceId: event.deviceId,
    entityId: event.entityId,
    eventCreatedAt: event.createdAt,
    eventId: event.eventId,
    payload: event.payload,
    tenantId,
    type: event.type
  });
