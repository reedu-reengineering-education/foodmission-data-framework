import { Injectable } from '@nestjs/common';
import { UserEvent } from '@prisma/client';
import {
  ClientRecordableEventType,
  EventSource,
  EventSubjectType,
} from '../event-types';
import { ClientEventMetadataDto } from '../dto/create-client-event.dto';
import { UserEventDto } from '../dto/user-event.dto';
import { asObjectMetadata } from '../user-event.utils';
import { UserEventService } from './user-event.service';

export interface RecordClientEventInput {
  userId: string;
  eventType: ClientRecordableEventType;
  metadata: ClientEventMetadataDto;
}

/**
 * Server-owned idempotency key. Includes authenticated userId so keys cannot
 * collide or leak across users. Do not use timestamps — retries must reuse the
 * same key.
 */
export function buildClientEventIdempotencyKey(
  eventType: ClientRecordableEventType,
  userId: string,
  sessionId: string,
): string {
  return `${eventType}:${userId}:${sessionId}`;
}

@Injectable()
export class ClientEventService {
  constructor(private readonly userEventService: UserEventService) {}

  async record(input: RecordClientEventInput): Promise<{
    event: UserEventDto;
    replayed: boolean;
  }> {
    const idempotencyKey = buildClientEventIdempotencyKey(
      input.eventType,
      input.userId,
      input.metadata.sessionId,
    );

    const metadata: Record<string, unknown> = {
      sessionId: input.metadata.sessionId,
      ...(input.metadata.platform != null
        ? { platform: input.metadata.platform }
        : {}),
      ...(input.metadata.appVersion != null
        ? { appVersion: input.metadata.appVersion }
        : {}),
      ...(input.metadata.durationSeconds != null
        ? { durationSeconds: input.metadata.durationSeconds }
        : {}),
    };

    const { event, replayed } = await this.userEventService.record({
      userId: input.userId,
      eventType: input.eventType,
      source: EventSource.APP,
      metadata,
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
