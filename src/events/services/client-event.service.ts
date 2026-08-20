import { Injectable } from '@nestjs/common';
import { UserEvent } from '@prisma/client';
import {
  CLIENT_RECORDABLE_EVENT_TYPES,
  ClientRecordableEventType,
  EventSource,
  EventSubjectType,
} from '../event-types';
import { UserEventDto } from '../dto/user-event.dto';
import { asObjectMetadata } from '../user-event.utils';
import { UserEventService } from './user-event.service';

/** Session event types that carry sessionId for server-side idempotency. */
const SESSION_EVENT_TYPES: ReadonlySet<string> = new Set([
  ...CLIENT_RECORDABLE_EVENT_TYPES.filter((t) =>
    t.startsWith('APP_SESSION_'),
  ),
]);

export interface RecordClientEventInput {
  userId: string;
  eventType: ClientRecordableEventType;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

/**
 * Server-owned idempotency key. Includes authenticated userId so keys cannot
 * collide or leak across users. Do not use timestamps — retries must reuse the
 * same key.
 */
@Injectable()
export class ClientEventService {
  constructor(private readonly userEventService: UserEventService) {}

  async record(input: RecordClientEventInput): Promise<{
    event: UserEventDto;
    replayed: boolean;
  }> {
    const isSessionEvent = SESSION_EVENT_TYPES.has(input.eventType);

    // Session events: build stable idempotency key from eventType:userId:sessionId.
    // Behavioural events: namespace the client-supplied key by userId (if provided).
    let idempotencyKey: string | undefined;
    if (isSessionEvent && typeof input.metadata?.sessionId === 'string') {
      idempotencyKey = `${input.eventType}:${input.userId}:${input.metadata.sessionId}`;
    } else if (input.idempotencyKey) {
      idempotencyKey = `${input.userId}:${input.idempotencyKey}`;
    }

    const source = isSessionEvent ? EventSource.APP : EventSource.QUICK_ACTION;

    const { event, replayed } = await this.userEventService.record({
      userId: input.userId,
      eventType: input.eventType,
      source,
      metadata: input.metadata ?? {},
      idempotencyKey,
      subject: { type: EventSubjectType.USER, id: input.userId },
    });

    return { event: this.toDto(event), replayed };
  }

  private toDto(event: UserEvent): UserEventDto {
    return {
      id: event.id,
      userId: event.userId,
      eventType: event.eventType,
      source: event.source,
      timestamp: event.createdAt,
      metadata: asObjectMetadata(event.metadata),
      groupId: event.groupId,
    };
  }
}
