import { createHttpError } from '../../lib/http-error.js';
import type { AccessContext } from '../tenant-core/access-context.js';
import { assertBranchAccess } from '../tenant-core/branch-scope.js';
import type { TenantCoreRepository } from '../tenant-core/tenant-core.repository.js';
import { assertSyncEventMatches } from './sync-event-signature.js';
import { toSyncEventFailure } from './sync-failure.js';
import { SyncEventConflictError, type SyncRepository } from './sync.repository.js';
import type {
  CreateSyncEventInput,
  SyncEventRecord,
  SyncPushRequest,
  SyncPushResult
} from './sync.types.js';

export const createSyncService = (
  repository: SyncRepository,
  tenantCoreRepository: TenantCoreRepository,
  replayEvent: (context: AccessContext, event: SyncEventRecord) => Promise<boolean>
) => ({
  pushEvents: async (context: AccessContext, input: SyncPushRequest): Promise<SyncPushResult> => {
    const events = input.events.map(toCreateSyncEventInput(context.tenantId));
    assertRequestEventConsistency(events);
    await assertAccessibleBranches(context, tenantCoreRepository, events);

    try {
      const results = await repository.createReceivedEvents(events);
      const finalEvents = await applyReplay(context, results, repository, replayEvent);

      return {
        acceptedCount: results.filter((item) => item.result === 'accepted').length,
        duplicateCount: results.filter((item) => item.result === 'duplicate').length,
        events: results.map(({ event, result }) => ({
          branchId: finalEvents.get(event.eventId)?.branchId ?? event.branchId,
          entityId: finalEvents.get(event.eventId)?.entityId ?? event.entityId,
          eventId: event.eventId,
          receivedAt: (finalEvents.get(event.eventId) ?? event).receivedAt.toISOString(),
          result,
          state: finalEvents.get(event.eventId)?.state ?? event.state,
          type: finalEvents.get(event.eventId)?.type ?? event.type
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

const applyReplay = async (
  context: AccessContext,
  results: Awaited<ReturnType<SyncRepository['createReceivedEvents']>>,
  repository: SyncRepository,
  replayEvent: (context: AccessContext, event: SyncEventRecord) => Promise<boolean>
) => {
  const finalEvents = new Map<string, SyncEventRecord>();

  for (const { event } of results) {
    if (finalEvents.has(event.eventId)) {
      continue;
    }

    finalEvents.set(event.eventId, await applyReplayForEvent(context, event, repository, replayEvent));
  }

  return finalEvents;
};

const applyReplayForEvent = async (
  context: AccessContext,
  event: SyncEventRecord,
  repository: SyncRepository,
  replayEvent: (context: AccessContext, event: SyncEventRecord) => Promise<boolean>
) => {
  if (event.state === 'APPLIED') {
    return event;
  }

  try {
    const wasApplied = await replayEvent(context, event);
    if (!wasApplied) {
      return event;
    }

    const updated = await repository.updateEventState(event.tenantId, event.eventId, {
      failure: null,
      state: 'APPLIED'
    });
    if (!updated) {
      throw new Error('Sync event missing after apply');
    }

    return updated;
  } catch (error) {
    const failed = await repository.updateEventState(event.tenantId, event.eventId, {
      failure: toSyncEventFailure(error),
      state: 'FAILED'
    });
    if (!failed) {
      throw new Error('Sync event missing after failure');
    }

    throw error;
  }
};

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
