import { Injectable } from '@nestjs/common';
import { Prisma, UserEvent } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { buildEventMetadata } from '../user-event.utils';
import { EventSourceValue } from '../event-types';

export interface RecordUserEventInput {
  userId: string;
  eventType: string;
  source: EventSourceValue;
  metadata?: Record<string, unknown>;
  groupId?: string | null;
  idempotencyKey?: string | null;
  subject?: { type: string; id?: string | null };
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
