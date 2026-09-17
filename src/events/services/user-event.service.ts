import { Injectable, Logger } from '@nestjs/common';
import { Prisma, UserEvent } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { buildEventMetadata } from '../user-event.utils';
import { EventSourceValue, EventSubject, EventTypeValue } from '../event-types';
import { RulesService } from '../../rules/rules.service';

export interface RecordUserEventInput {
  userId: string;
  eventType: EventTypeValue;
  source: EventSourceValue;
  metadata?: Record<string, unknown>;
  groupId?: string | null;
  idempotencyKey?: string | null;
  subject?: EventSubject;
}

@Injectable()
export class UserEventService {
  private readonly logger = new Logger(UserEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesService: RulesService,
  ) {}

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

      if (this.shouldEvaluateDerivedProgress(event.eventType)) {
        if (tx) {
          await this.runDerivedProgressEvaluation(
            event.userId,
            event.eventType,
            tx,
          );
        } else {
          void this.runDerivedProgressEvaluation(event.userId, event.eventType);
        }
      }

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

  private async runDerivedProgressEvaluation(
    userId: string,
    eventType: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    try {
      await this.rulesService.evaluateUserEvent(userId, eventType, tx);
    } catch (error) {
      this.logger.error(
        `Derived progress evaluation failed for ${eventType} and user ${userId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private shouldEvaluateDerivedProgress(eventType: string): boolean {
    return !this.shouldIgnoreDerivedProgressEvent(eventType);
  }

  private shouldIgnoreDerivedProgressEvent(eventType: string): boolean {
    return (
      eventType.startsWith('MISSION_') ||
      eventType.startsWith('CHALLENGE_') ||
      eventType.startsWith('QUEST_') ||
      eventType.startsWith('WALLET_') ||
      eventType.startsWith('BADGE_') ||
      eventType.startsWith('PROGRESS_INDICATOR_')
    );
  }
}
