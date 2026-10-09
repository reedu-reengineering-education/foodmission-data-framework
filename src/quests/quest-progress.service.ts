import { Injectable, Logger } from '@nestjs/common';
import { Prisma, RewardSourceType } from '@prisma/client';
import { AfterCommitQueue } from '../common/after-commit/after-commit.queue';
import { ProgressStatus } from '../common/progress-status';
import { PrismaService } from '../database/prisma.service';
import { EventSource, EventType } from '../events/event-types';
import { UserEventService } from '../events/services/user-event.service';
import {
  ContentItemRef,
  findFinishedItemKeys,
  UNOBSERVABLE_CONTENT_TYPES,
} from '../gamification/content-completion';
import { CompletionRewardService } from '../gamification/services/completion-reward.service';
import { DimensionLevelService } from '../gamification/services/dimension-level.service';
import {
  QuestProgressRecomputer,
  QuestTriggerEvent,
} from './quest-progress.types';

/** Completing one of these can move a quest forward. */
const TRIGGER_EVENT_TYPES: ReadonlySet<string> = new Set<string>([
  EventType.MISSION_COMPLETED,
  EventType.CHALLENGE_COMPLETED,
  // Both, because a user can change a wrong answer to a right one and that
  // transition has to count.
  EventType.QUIZ_ANSWERED,
  EventType.QUIZ_UPDATED,
  EventType.LEARNING_FACT_READ,
]);

// Unobservable item types (UNOBSERVABLE_CONTENT_TYPES) are excluded from the
// denominator rather than counted as unfinished: a single such item would
// otherwise cap the quest below 100% forever, silently withholding a reward,
// with nothing in the schema (QuestItem has no FK) to catch it.
type QuestItemRef = ContentItemRef;

type LoadedQuest = {
  id: string;
  code: string;
  dimensionId: string;
  items: QuestItemRef[];
};

export type QuestRecomputeOutcome = {
  questId: string;
  code: string;
  dimensionId: string;
  progress: number;
  completed: boolean;
  /** True when this recompute is the one that flipped the quest to completed. */
  firstCompletion: boolean;
};

@Injectable()
export class QuestProgressService implements QuestProgressRecomputer {
  private readonly logger = new Logger(QuestProgressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userEventService: UserEventService,
    private readonly completionRewardService: CompletionRewardService,
    private readonly afterCommit: AfterCommitQueue,
    private readonly dimensionLevelService: DimensionLevelService,
  ) {}

  onCompletionEvent(trigger: QuestTriggerEvent): void {
    if (!TRIGGER_EVENT_TYPES.has(trigger.eventType)) {
      return;
    }

    this.afterCommit.schedule([
      {
        label: `quest recompute for user ${trigger.userId} after ${trigger.eventType}`,
        // The trigger event was very likely written inside the caller's
        // transaction. Seeing that row on the base client proves the whole
        // transaction committed — one check covering every signal, and if the
        // caller rolled back we correctly do nothing.
        confirm: () => this.isEventVisible(trigger.eventId),
        run: async () => {
          await this.recomputeForUser(trigger.userId);
        },
      },
    ]);
  }

  /**
   * Recomputes every candidate quest for the user from current item state, and
   * credits the reward for any that just completed.
   *
   * Runs on the base Prisma client, never inside a caller's transaction: it
   * issues several statements and ends in a wallet write, and a failure inside
   * someone else's transaction would poison it (Postgres aborts the whole
   * transaction on the first failed statement, and catching the error does not
   * undo that).
   */
  async recomputeForUser(
    userId: string,
    questIds?: string[],
  ): Promise<QuestRecomputeOutcome[]> {
    const quests = await this.loadCandidateQuests(userId, questIds);
    const outcomes: QuestRecomputeOutcome[] = [];

    for (const quest of quests) {
      const outcome = await this.recomputeQuest(userId, quest);
      if (outcome) {
        outcomes.push(outcome);
      }
    }

    const completedNow = outcomes.filter((o) => o.firstCompletion);
    for (const outcome of completedNow) {
      await this.awardQuestReward(userId, outcome);
    }

    // Finishing the last quest of a level unlocks the next level's quests.
    for (const dimensionId of new Set(completedNow.map((o) => o.dimensionId))) {
      await this.dimensionLevelService.levelUpIfComplete(userId, dimensionId);
    }

    return outcomes;
  }

  /**
   * The only candidate is the user's current quest: progress made while a
   * quest isn't selected is never credited to it, as with its missions and
   * challenges, whose rows are dropped when the user switches quests.
   *
   * Completed quests are deliberately excluded. A `QuizProgress.isCorrect` can
   * flip back to false on re-answer, which would drag an already-rewarded quest
   * below 100% — a visibly broken state. Once finished, a quest stays finished.
   */
  private async loadCandidateQuests(
    userId: string,
    questIds?: string[],
  ): Promise<LoadedQuest[]> {
    const select = {
      id: true,
      code: true,
      dimensionId: true,
      items: { select: { contentType: true, contentCode: true } },
    } as const;

    if (questIds) {
      return questIds.length === 0
        ? []
        : this.prisma.quest.findMany({
            where: { id: { in: questIds }, available: true },
            select,
          });
    }

    // Level rows exist from the start (BEGINNER before the onboarding
    // survey); create them lazily for users who predate that, since a
    // completion here may level the user up.
    await this.dimensionLevelService.ensureForUser(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentQuestId: true },
    });
    const questId = user?.currentQuestId;
    if (!questId) {
      return [];
    }

    const row = await this.prisma.questProgress.findUnique({
      where: { userId_questId: { userId, questId } },
      select: { completed: true },
    });
    if (row?.completed) {
      return [];
    }

    return this.prisma.quest.findMany({
      where: { id: questId, available: true },
      select,
    });
  }

  private async recomputeQuest(
    userId: string,
    quest: LoadedQuest,
  ): Promise<QuestRecomputeOutcome | null> {
    const excluded = quest.items.filter((item) =>
      UNOBSERVABLE_CONTENT_TYPES.has(item.contentType),
    );
    const scored = quest.items.filter(
      (item) => !UNOBSERVABLE_CONTENT_TYPES.has(item.contentType),
    );

    if (excluded.length > 0) {
      this.logger.warn(
        `Quest ${quest.code}: ${excluded.length} item(s) of unobservable type excluded from scoring (${excluded
          .map((item) => `${item.contentType}:${item.contentCode}`)
          .join(', ')})`,
      );
    }

    if (scored.length === 0) {
      // Nothing observable to score. Writing 0/0 as 100% would pay a reward for
      // a quest nobody can actually do.
      this.logger.warn(
        `Quest ${quest.code} has no scorable items; skipping recompute`,
      );
      return null;
    }

    const finished = await findFinishedItemKeys(this.prisma, userId, scored);
    const completed = finished.size === scored.length;
    // Rounded before it is stored and before it goes into a QUEST_UPDATED
    // idempotency key: 4/9*100 is 44.44444444444444, and float jitter between
    // two recomputes of identical state would emit a spurious event.
    const progress = Math.round((finished.size / scored.length) * 10000) / 100;
    const status = completed
      ? ProgressStatus.COMPLETED
      : finished.size > 0
        ? ProgressStatus.IN_PROGRESS
        : ProgressStatus.NOT_STARTED;

    const previous = await this.prisma.questProgress.findUnique({
      where: { userId_questId: { userId, questId: quest.id } },
      select: { progress: true, completed: true, unlockedAt: true },
    });
    const state = {
      source: 'DERIVED',
      total: scored.length,
      finished: finished.size,
      finishedCodes: [...finished],
      excludedCodes: excluded.map(
        (item) => `${item.contentType}:${item.contentCode}`,
      ),
      computedAt: new Date().toISOString(),
    } satisfies Prisma.JsonObject;

    await this.prisma.questProgress.upsert({
      where: { userId_questId: { userId, questId: quest.id } },
      create: {
        userId,
        questId: quest.id,
        progress,
        completed,
        status,
        state,
        unlockedAt: new Date(),
        evaluatedAt: new Date(),
      },
      update: {
        progress,
        completed,
        status,
        state,
        evaluatedAt: new Date(),
      },
    });

    const firstCompletion = completed && !previous?.completed;
    await this.emitTransitionEvents(userId, quest, {
      previous,
      progress,
      completed,
      firstCompletion,
    });

    return {
      questId: quest.id,
      code: quest.code,
      dimensionId: quest.dimensionId,
      progress,
      completed,
      firstCompletion,
    };
  }

  private async emitTransitionEvents(
    userId: string,
    quest: LoadedQuest,
    change: {
      previous: { progress: number; completed: boolean } | null;
      progress: number;
      completed: boolean;
      firstCompletion: boolean;
    },
  ): Promise<void> {
    const metadata = {
      questId: quest.id,
      questCode: quest.code,
      source: 'QUEST_PROGRESS',
      body: { progress: change.progress, completed: change.completed },
    };

    const changed =
      change.previous == null ||
      change.previous.progress !== change.progress ||
      change.previous.completed !== change.completed;

    // Only on an actual change, or every unrelated recompute writes a row.
    if (changed) {
      await this.userEventService.record({
        userId,
        eventType: EventType.QUEST_UPDATED,
        source: EventSource.QUEST,
        metadata,
        // Same shape as the key the PATCH path builds, so the two paths
        // deduplicate against each other.
        idempotencyKey: `quest-updated:${userId}:${quest.id}:${change.progress}:${change.completed}`,
      });
    }

    if (change.firstCompletion) {
      await this.userEventService.record({
        userId,
        eventType: EventType.QUEST_COMPLETED,
        source: EventSource.QUEST,
        metadata,
        idempotencyKey: `quest-completed:${userId}:${quest.id}`,
      });
    }
  }

  /**
   * Reads the reward fresh rather than carrying it along from the candidate
   * query, so a reward edited after the quest was loaded is honoured.
   */
  private async awardQuestReward(
    userId: string,
    outcome: QuestRecomputeOutcome,
  ): Promise<void> {
    const quest = await this.prisma.quest.findUnique({
      where: { id: outcome.questId },
      select: { reward: { select: { id: true, xp: true, points: true } } },
    });

    await this.completionRewardService.awardCompletion({
      userId,
      sourceType: RewardSourceType.QUEST,
      sourceId: outcome.questId,
      code: outcome.code,
      reward: quest?.reward,
    });
  }

  private async isEventVisible(eventId: string): Promise<boolean> {
    const row = await this.prisma.userEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    return row != null;
  }

  /** Tests and graceful shutdown; the request path never waits on this. */
  async awaitPendingRecomputes(): Promise<void> {
    await this.afterCommit.awaitIdle();
  }
}
