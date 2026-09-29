import { Prisma, UserEvent } from '@prisma/client';
import { EventSourceValue, EventSubject, EventTypeValue } from './event-types';

/**
 * Leaf module: contract and DI token for writing to the UserEvent ledger.
 *
 * `RulesService` needs to record events, but `UserEventService` imports
 * `RulesService` (it drives rule evaluation post-write). Importing the
 * implementation back would close a file-level cycle, so consumers depend on
 * this file, which imports nothing of ours but `event-types`.
 */
export interface RecordUserEventInput {
  userId: string;
  eventType: EventTypeValue;
  source: EventSourceValue;
  metadata?: Record<string, unknown>;
  groupId?: string | null;
  idempotencyKey?: string | null;
  subject?: EventSubject;
}

export interface UserEventRecorder {
  record(
    input: RecordUserEventInput,
    tx?: Prisma.TransactionClient,
  ): Promise<{ event: UserEvent; replayed: boolean }>;
}

export const USER_EVENT_RECORDER = Symbol('USER_EVENT_RECORDER');
