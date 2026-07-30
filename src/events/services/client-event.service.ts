import { Injectable } from '@nestjs/common';
import { UserEvent } from '@prisma/client';
import {
  EventSource,
  EventSubjectType,
  ClientRecordableEventType,
} from '../event-types';
import { UserEventDto } from '../dto/user-event.dto';
import { UserEventService } from './user-event.service';
import { asObjectMetadata } from '../user-event.utils';

export interface RecordClientEventInput {
  userId: string;
  eventType: ClientRecordableEventType;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

@Injectable()
export class ClientEventService {
  constructor(private readonly userEventService: UserEventService) {}

  async record(input: RecordClientEventInput): Promise<{
    event: UserEventDto;
    replayed: boolean;
  }> {
    const { event, replayed } = await this.userEventService.record({
      userId: input.userId,
      eventType: input.eventType,
      source: EventSource.APP,
      metadata: input.metadata,
      idempotencyKey: input.idempotencyKey,
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
