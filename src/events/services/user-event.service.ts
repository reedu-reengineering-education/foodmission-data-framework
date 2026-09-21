import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Prisma, UserEvent } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { buildEventMetadata } from '../user-event.utils';
import { RulesService } from '../../rules/rules.service';
import {
  QUEST_PROGRESS_RECOMPUTER,
  QuestProgressRecomputer,
} from '../../quests/quest-progress.types';
import {
  BADGE_RULE_EVALUATOR,
  BadgeRuleEvaluator,
} from '../../badges/badge-rules.types';
import {
  RecordUserEventInput,
  UserEventRecorder,
} from '../user-event-recorder.types';

// Re-exported so existing importers keep working; the canonical home is now the
// leaf types module, which RulesService can import without closing a cycle.
export { RecordUserEventInput };

@Injectable()
export class UserEventService implements UserEventRecorder {
  private readonly logger = new Logger(UserEventService.name);

  /** `undefined` = not looked up yet, `null` = not mounted in this app. */
  private questRecomputer?: QuestProgressRecomputer | null;
  private badgeEvaluator?: BadgeRuleEvaluator | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesService: RulesService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Resolved lazily by token: QuestsModule depends on this module, so injecting
   * the service here would close a cycle. Absence is tolerated — lean e2e apps
   * mount EventsModule without QuestsModule.
   */
  private getQuestRecomputer(): QuestProgressRecomputer | null {
    if (this.questRecomputer === undefined) {
      try {
        this.questRecomputer = this.moduleRef.get<QuestProgressRecomputer>(
          QUEST_PROGRESS_RECOMPUTER,
          { strict: false },
        );
      } catch {
        this.questRecomputer = null;
      }
    }
    return this.questRecomputer;
  }

  /** Resolved lazily by token, for the same reason as the quest recomputer. */
  private getBadgeEvaluator(): BadgeRuleEvaluator | null {
    if (this.badgeEvaluator === undefined) {
      try {
        this.badgeEvaluator = this.moduleRef.get<BadgeRuleEvaluator>(
          BADGE_RULE_EVALUATOR,
          { strict: false },
        );
      } catch {
        this.badgeEvaluator = null;
      }
    }
    return this.badgeEvaluator;
  }

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

      // Badges are evaluated separately and on a wider set of events: the
      // MISSION_/QUEST_ completions excluded above are exactly what several
      // badge rules count. BadgeRulesService keeps its own, narrower exclusion
      // list, so there is no filtering to do here.
      if (tx) {
        await this.runBadgeEvaluation(event.userId, event.eventType, tx);
      } else {
        void this.runBadgeEvaluation(event.userId, event.eventType);
      }

      // Only on a fresh write. A replayed event means some earlier call already
      // recomputed for it, so the completion is counted exactly once.
      this.getQuestRecomputer()?.onCompletionEvent({
        userId: event.userId,
        eventId: event.id,
        eventType: event.eventType,
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

  private async runBadgeEvaluation(
    userId: string,
    eventType: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    try {
      await this.getBadgeEvaluator()?.evaluateUserEvent(userId, eventType, tx);
    } catch (error) {
      this.logger.error(
        `Badge evaluation failed for ${eventType} and user ${userId}`,
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
