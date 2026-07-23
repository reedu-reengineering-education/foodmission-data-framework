import { Injectable } from '@nestjs/common';
import { Prisma, UserEvent } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { buildEventMetadata } from '../user-event.utils';
import {
  EventSourceValue,
  EventSubject,
  EventTypeValue,
} from '../event-types';

/**
 * Input for appending a {@link UserEvent}.
 *
 * Catalog and metadata conventions: see `event-types.ts`.
 *
 * @example
 * ```ts
 * await userEventService.record({
 *   userId,
 *   eventType: EventType.MEAL_MEAT_FREE,
 *   source: EventSource.MEAL_LOG,
 *   metadata: { mealId, mealType: 'lunch' },
 *   subject: { type: EventSubjectType.MEAL, id: mealId },
 *   idempotencyKey: `meal-meat-free:${userId}:${mealId}`,
 * });
 * ```
 */
export interface RecordUserEventInput {
  userId: string;
  /** What happened — `EventType.*`. */
  eventType: EventTypeValue;
  /** Producing feature/channel — `EventSource.*`. */
  source: EventSourceValue;
  /**
   * Context only (ids, amounts, tags). Merged with `subject` into stored JSON.
   * Do not put the event kind here; use `eventType`.
   */
  metadata?: Record<string, unknown>;
  /** Optional group scope for the event. */
  groupId?: string | null;
  /**
   * When set, unique — concurrent/retrying callers get the existing row
   * (`replayed: true`) instead of a second write.
   */
  idempotencyKey?: string | null;
  /**
   * Primary entity; written to `metadata.subject` as `{ type, id? }`.
   * Prefer `EventSubjectType.*` for `type`.
   */
  subject?: EventSubject;
}

@Injectable()
export class UserEventService {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdempotencyKey(
    idempotencyKey: string,
    tx?: Prisma.TransactionClient,
    include?: Prisma.UserEventInclude,
  ): Promise<
    | Prisma.UserEventGetPayload<{ include: Prisma.UserEventInclude }>
    | UserEvent
    | null
  > {
    const db = tx ?? this.prisma;
    return db.userEvent.findUnique({
      where: { idempotencyKey },
      include,
    });
  }

  /**
   * Append a user event. Pass `tx` to participate in an outer transaction.
   * Returns `replayed: true` when `idempotencyKey` already existed.
   */
  async record(
    input: RecordUserEventInput,
    tx?: Prisma.TransactionClient,
  ): Promise<{ event: UserEvent; replayed: boolean }> {
    const db = tx ?? this.prisma;

    if (input.idempotencyKey) {
      const existing = await db.userEvent.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return { event: existing, replayed: true };
      }
    }

    const metadata = buildEventMetadata(input.metadata ?? {}, input.subject);

    try {
      const event = await db.userEvent.create({
        data: {
          userId: input.userId,
          groupId: input.groupId ?? null,
          eventType: input.eventType,
          source: input.source,
          metadata: metadata as Prisma.InputJsonValue,
          idempotencyKey: input.idempotencyKey ?? null,
        },
      });
      return { event, replayed: false };
    } catch (error) {
      if (
        input.idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await db.userEvent.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (existing) {
          return { event: existing, replayed: true };
        }
      }
      throw error;
    }
  }
}
