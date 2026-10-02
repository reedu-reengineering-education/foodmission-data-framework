import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { PrismaService } from '../database/prisma.service';
import {
  AfterCommitQueue,
  AfterCommitTask,
} from '../common/after-commit/after-commit.queue';
import { ProgressStatus } from '../common/progress-status';
import { progressEventKey } from '../common/progress-event-keys';
import { EventSource, EventType, EventTypeValue } from '../events/event-types';
import {
  USER_EVENT_RECORDER,
  UserEventRecorder,
} from '../events/user-event-recorder.types';
import {
  COMPLETION_REWARD_AWARDER,
  CompletionRewardAwarder,
  CompletionRewardRef,
} from '../gamification/completion-reward.types';
import { Prisma, RewardSourceType } from '@prisma/client';
import {
  RuleDefinition,
  RuleEntry,
  RulesCoverageDoc,
  rulesCoverageSchema,
} from './rule-schema';
import {
  evaluateRule,
  hashRule,
  maxWindowDays,
  UserEventRow,
} from './rule-evaluator';

type CatalogItem = {
  id: string;
  code: string;
};

type ActiveQuestScope = {
  missionCodes: Set<string>;
  challengeCodes: Set<string>;
};

/** A user's progress row for one in-scope mission/challenge. */
type ScopedProgress = {
  status: string;
  startedAt: Date | null;
};

/** COMPLETED and FAILED are final: the evaluator never changes them again. */
function isResolved(status: string | undefined): boolean {
  return (
    status === ProgressStatus.COMPLETED || status === ProgressStatus.FAILED
  );
}

/** A mission/challenge the evaluator just moved to COMPLETED for the first time. */
type CompletionAward = {
  userId: string;
  kind: 'mission' | 'challenge';
  id: string;
  code: string;
};

@Injectable()
export class RulesService implements OnModuleInit {
  private readonly logger = new Logger(RulesService.name);
  private readonly rulesPath = join(
    process.cwd(),
    'prisma',
    'seeds',
    'data',
    'rules',
    'rules-coverage.yml',
  );

  private loadedRules?: RulesCoverageDoc;
  private missionCatalog?: CatalogItem[];
  private challengeCatalog?: CatalogItem[];
  private awarder?: CompletionRewardAwarder;
  private recorder?: UserEventRecorder;

  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleRef: ModuleRef,
    private readonly afterCommit: AfterCommitQueue,
  ) {}

  /**
   * Resolves the reward awarder lazily rather than injecting it.
   *
   * The dependency is cyclic (rules -> gamification -> events -> rules: the
   * wallet writes UserEvents and UserEvents drive rule evaluation). Declaring
   * that cycle with `forwardRef` hangs Nest's resolver, because RulesModule is
   * `@Global()`. A lazy cross-module lookup keeps RulesModule importing nothing
   * but DatabaseModule, so there is no module cycle to resolve at all.
   */
  private getAwarder(): CompletionRewardAwarder {
    this.awarder ??= this.moduleRef.get<CompletionRewardAwarder>(
      COMPLETION_REWARD_AWARDER,
      { strict: false },
    );
    return this.awarder;
  }

  /** Lazy for the same reason as `getAwarder` — see the comment above. */
  private getRecorder(): UserEventRecorder {
    this.recorder ??= this.moduleRef.get<UserEventRecorder>(
      USER_EVENT_RECORDER,
      { strict: false },
    );
    return this.recorder;
  }

  onModuleInit(): void {
    this.load();
  }

  load(): RulesCoverageDoc {
    if (this.loadedRules) {
      return this.loadedRules;
    }

    const raw = yaml.load(readFileSync(this.rulesPath, 'utf8'));
    const validated = rulesCoverageSchema.validate(raw, {
      abortEarly: false,
      allowUnknown: false,
    });

    if (validated.error) {
      throw new Error(
        `Invalid rules draft: ${validated.error.details
          .map((detail) => `${detail.message} @ ${detail.path.join('.')}`)
          .join('; ')}`,
      );
    }

    this.loadedRules = validated.value as RulesCoverageDoc;
    this.logger.log(
      `Loaded rules draft: ${this.loadedRules.missions.length} missions, ${this.loadedRules.challenges.length} challenges`,
    );
    return this.loadedRules;
  }

  async evaluateUserEvent(
    userId: string,
    eventType: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (this.shouldIgnoreEventType(eventType)) {
      return;
    }
    await this.evaluateUser(userId, tx);
  }

  /**
   * Re-scores every rule-backed mission and challenge in the user's current
   * quest. Called on each behavioural event, and by the deadline scheduler so
   * an item whose window ended fails even when the user records nothing.
   * COMPLETED and FAILED items are final and skipped.
   */
  async evaluateUser(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const rules = this.load();
    const db = tx ?? this.prisma;
    const activeScope = await this.getActiveQuestScope(db, userId);

    if (
      activeScope.missionCodes.size === 0 &&
      activeScope.challengeCodes.size === 0
    ) {
      return;
    }

    const missionCatalog = await this.getMissionCatalog(db);
    const challengeCatalog = await this.getChallengeCatalog(db);
    const missionProgress = await this.getScopedMissionProgress(
      db,
      userId,
      missionCatalog,
      activeScope,
    );
    const challengeProgress = await this.getScopedChallengeProgress(
      db,
      userId,
      challengeCatalog,
      activeScope,
    );

    // Anchored windows can start before the usual lookback (a 7-day mission
    // started 9 days ago), and `before_start` counters look at the week before
    // a start, so reach back the widest window from the oldest open start.
    const lookbackDays = this.getMaxWindowDays(rules);
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);
    for (const row of [
      ...missionProgress.values(),
      ...challengeProgress.values(),
    ]) {
      if (isResolved(row.status) || !row.startedAt) continue;
      const windowFloor = new Date(row.startedAt);
      windowFloor.setDate(windowFloor.getDate() - lookbackDays);
      if (windowFloor < since) {
        since.setTime(windowFloor.getTime());
      }
    }

    const events = (await db.userEvent.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        eventType: true,
        createdAt: true,
        metadata: true,
      },
    })) as UserEventRow[];

    const missionRules = rules.missions.filter(
      (entry) =>
        entry.shape !== 'undecided' && activeScope.missionCodes.has(entry.code),
    );
    const challengeRules = rules.challenges.filter(
      (entry) =>
        entry.shape !== 'undecided' &&
        activeScope.challengeCodes.has(entry.code),
    );

    const completions: CompletionAward[] = [];

    for (const entry of missionRules) {
      const catalogItem = missionCatalog.find(
        (item) => item.code === entry.code,
      );
      if (!catalogItem || !entry.rule) {
        continue;
      }
      if (isResolved(missionProgress.get(catalogItem.id)?.status)) {
        continue;
      }
      const completion = await this.syncProgress(
        db,
        events,
        userId,
        catalogItem,
        entry,
        'mission',
      );
      if (completion) {
        completions.push(completion);
      }
    }

    for (const entry of challengeRules) {
      const catalogItem = challengeCatalog.find(
        (item) => item.code === entry.code,
      );
      if (!catalogItem || !entry.rule) {
        continue;
      }
      if (isResolved(challengeProgress.get(catalogItem.id)?.status)) {
        continue;
      }
      const completion = await this.syncProgress(
        db,
        events,
        userId,
        catalogItem,
        entry,
        'challenge',
      );
      if (completion) {
        completions.push(completion);
      }
    }

    if (completions.length === 0) {
      return;
    }

    const tasks = completions.map((completion) => this.toAwardTask(completion));

    if (tx) {
      // The progress rows above were written inside the caller's open
      // transaction. Awarding here would mean `GamificationWalletService.award`
      // opening its own transaction on a second connection and blocking on the
      // locks this one still holds (it takes `FOR UPDATE` on the wallet row) —
      // a deadlock until the statement timeout. Hand the awards off instead.
      this.afterCommit.schedule(tasks);
      return;
    }

    await this.afterCommit.run(tasks);
  }

  /**
   * Users with at least one open (not COMPLETED/FAILED), started mission or
   * challenge whose rule window has ended: `startedAt + window.days <= now`
   * for a rule with a `since_start` window. Items without a rule never time
   * out. Used by the deadline scheduler to fail them without a new event.
   */
  async findUsersWithExpiredItems(now: Date = new Date()): Promise<string[]> {
    const rules = this.load();
    const userIds = new Set<string>();

    const kinds = [
      {
        entries: rules.missions,
        catalog: await this.getMissionCatalog(this.prisma),
        query: (ids: string[], startedBefore: Date) =>
          this.prisma.missionProgress.findMany({
            where: {
              missionId: { in: ids },
              status: {
                notIn: [ProgressStatus.COMPLETED, ProgressStatus.FAILED],
              },
              startedAt: { not: null, lte: startedBefore },
            },
            select: { userId: true },
            distinct: ['userId'],
          }),
      },
      {
        entries: rules.challenges,
        catalog: await this.getChallengeCatalog(this.prisma),
        query: (ids: string[], startedBefore: Date) =>
          this.prisma.challengeProgress.findMany({
            where: {
              challengeId: { in: ids },
              status: {
                notIn: [ProgressStatus.COMPLETED, ProgressStatus.FAILED],
              },
              startedAt: { not: null, lte: startedBefore },
            },
            select: { userId: true },
            distinct: ['userId'],
          }),
      },
    ];

    for (const { entries, catalog, query } of kinds) {
      // Group items by window length: one query per distinct deadline.
      const idsByDays = new Map<number, string[]>();
      for (const entry of entries) {
        const window = entry.rule?.window;
        if (entry.shape === 'undecided' || window?.type !== 'since_start') {
          continue;
        }
        const item = catalog.find((candidate) => candidate.code === entry.code);
        if (!item) continue;
        const days = window.days ?? 7;
        idsByDays.set(days, [...(idsByDays.get(days) ?? []), item.id]);
      }

      for (const [days, ids] of idsByDays) {
        const startedBefore = new Date(now);
        startedBefore.setDate(startedBefore.getDate() - days);
        for (const row of await query(ids, startedBefore)) {
          userIds.add(row.userId);
        }
      }
    }

    return [...userIds];
  }

  /**
   * Resolves once every award scheduled so far has settled. For tests and
   * graceful shutdown — the request path never waits on this.
   */
  async awaitPendingAwards(): Promise<void> {
    await this.afterCommit.awaitIdle();
  }

  private toAwardTask(completion: CompletionAward): AfterCommitTask {
    return {
      label: `${completion.kind} ${completion.code} reward for user ${completion.userId}`,
      confirm: () => this.confirmCompleted(completion),
      run: async () => {
        const reward = await this.loadReward(completion);
        await this.getAwarder().awardCompletion({
          userId: completion.userId,
          sourceType:
            completion.kind === 'mission'
              ? RewardSourceType.MISSION
              : RewardSourceType.CHALLENGE,
          sourceId: completion.id,
          code: completion.code,
          reward,
        });
      },
    };
  }

  /**
   * Re-reads the progress row on the base client to confirm the completion is
   * actually visible (i.e. committed) before any wallet credit.
   */
  private async confirmCompleted(
    completion: CompletionAward,
  ): Promise<boolean> {
    const row =
      completion.kind === 'mission'
        ? await this.prisma.missionProgress.findUnique({
            where: {
              userId_missionId: {
                userId: completion.userId,
                missionId: completion.id,
              },
            },
            select: { completed: true },
          })
        : await this.prisma.challengeProgress.findUnique({
            where: {
              userId_challengeId: {
                userId: completion.userId,
                challengeId: completion.id,
              },
            },
            select: { completed: true },
          });

    return row?.completed === true;
  }

  private async loadReward(
    completion: CompletionAward,
  ): Promise<CompletionRewardRef | null | undefined> {
    const row =
      completion.kind === 'mission'
        ? await this.prisma.mission.findUnique({
            where: { id: completion.id },
            select: {
              reward: { select: { id: true, xp: true, points: true } },
            },
          })
        : await this.prisma.challenge.findUnique({
            where: { id: completion.id },
            select: {
              reward: { select: { id: true, xp: true, points: true } },
            },
          });

    return row?.reward;
  }

  private async getMissionCatalog(
    db: Prisma.TransactionClient | PrismaService,
  ): Promise<CatalogItem[]> {
    if (this.missionCatalog) {
      return this.missionCatalog;
    }

    // Rewards are deliberately not cached here: this catalog lives for the
    // lifetime of the process, and a stale xp/points value would be credited
    // for real. They are read fresh in `drainCompletionAwards`.
    const rows = await db.mission.findMany({
      where: { available: true },
      select: {
        id: true,
        code: true,
      },
    });
    this.missionCatalog = rows;
    return rows;
  }

  private async getChallengeCatalog(
    db: Prisma.TransactionClient | PrismaService,
  ): Promise<CatalogItem[]> {
    if (this.challengeCatalog) {
      return this.challengeCatalog;
    }

    // See `getMissionCatalog` on why rewards are not cached alongside the code.
    const rows = await db.challenge.findMany({
      where: { available: true },
      select: {
        id: true,
        code: true,
      },
    });
    this.challengeCatalog = rows;
    return rows;
  }

  private async syncProgress(
    db: Prisma.TransactionClient | PrismaService,
    events: UserEventRow[],
    userId: string,
    catalogItem: CatalogItem,
    entry: RuleEntry,
    kind: 'mission' | 'challenge',
  ): Promise<CompletionAward | null> {
    const previous =
      kind === 'mission'
        ? await db.missionProgress.findUnique({
            where: { userId_missionId: { userId, missionId: catalogItem.id } },
            select: {
              progress: true,
              completed: true,
              startedAt: true,
            },
          })
        : await db.challengeProgress.findUnique({
            where: {
              userId_challengeId: { userId, challengeId: catalogItem.id },
            },
            select: {
              progress: true,
              completed: true,
              startedAt: true,
            },
          });

    // The window starts when the item was started, so its deadline is known.
    const { completed, failed, progress } = evaluateRule(
      entry.rule as RuleDefinition,
      events,
      new Date(),
      previous?.startedAt,
    );
    const ruleHash = hashRule(entry.rule);
    const status = completed
      ? ProgressStatus.COMPLETED
      : failed
        ? ProgressStatus.FAILED
        : progress > 0
          ? ProgressStatus.IN_PROGRESS
          : ProgressStatus.NOT_STARTED;

    // Nothing to record for an item the user hasn't started or touched.
    if (!previous && progress <= 0 && !completed) {
      return null;
    }

    const previousCompleted = previous?.completed ?? false;
    const previousProgress = previous?.progress ?? 0;
    const started =
      (previous == null || (previousProgress === 0 && !previousCompleted)) &&
      (progress > 0 || completed);
    const updated =
      previous != null &&
      (previousProgress !== progress || previousCompleted !== completed);
    const firstCompletion = completed && !previousCompleted;
    const startedAt =
      previous?.startedAt ?? (progress > 0 || completed ? new Date() : null);

    if (kind === 'mission') {
      await db.missionProgress.upsert({
        where: { userId_missionId: { userId, missionId: catalogItem.id } },
        create: {
          userId,
          missionId: catalogItem.id,
          progress,
          completed,
          status,
          state: this.buildState(entry, status, progress, completed, ruleHash),
          startedAt,
          ruleHash,
          evaluatedAt: new Date(),
        },
        update: {
          progress,
          completed,
          status,
          state: this.buildState(entry, status, progress, completed, ruleHash),
          startedAt,
          ruleHash,
          evaluatedAt: new Date(),
        },
      });
    } else {
      await db.challengeProgress.upsert({
        where: { userId_challengeId: { userId, challengeId: catalogItem.id } },
        create: {
          userId,
          challengeId: catalogItem.id,
          progress,
          completed,
          status,
          state: this.buildState(entry, status, progress, completed, ruleHash),
          startedAt,
          ruleHash,
          evaluatedAt: new Date(),
        },
        update: {
          progress,
          completed,
          status,
          state: this.buildState(entry, status, progress, completed, ruleHash),
          startedAt,
          ruleHash,
          evaluatedAt: new Date(),
        },
      });
    }

    if (started) {
      await this.emitDerivedEvent(db, {
        userId,
        kind,
        event:
          kind === 'mission'
            ? EventType.MISSION_STARTED
            : EventType.CHALLENGE_STARTED,
        transition: 'started',
        code: entry.code,
        id: catalogItem.id,
        progress,
        completed,
        startedAt,
      });
    } else if (updated) {
      await this.emitDerivedEvent(db, {
        userId,
        kind,
        event:
          kind === 'mission'
            ? EventType.MISSION_UPDATED
            : EventType.CHALLENGE_UPDATED,
        transition: 'updated',
        code: entry.code,
        id: catalogItem.id,
        progress,
        completed,
        startedAt,
      });
    }

    if (failed) {
      // Rows reach here at most once as FAILED: resolved rows are skipped.
      await this.emitDerivedEvent(db, {
        userId,
        kind,
        event:
          kind === 'mission'
            ? EventType.MISSION_FAILED
            : EventType.CHALLENGE_FAILED,
        transition: 'failed',
        code: entry.code,
        id: catalogItem.id,
        progress,
        completed,
        startedAt,
      });
      return null;
    }

    if (!firstCompletion) {
      return null;
    }

    await this.emitDerivedEvent(db, {
      userId,
      kind,
      event:
        kind === 'mission'
          ? EventType.MISSION_COMPLETED
          : EventType.CHALLENGE_COMPLETED,
      transition: 'completed',
      code: entry.code,
      id: catalogItem.id,
      progress,
      completed,
      startedAt,
    });

    return { userId, kind, id: catalogItem.id, code: entry.code };
  }

  /**
   * Records a derived progress event through the shared ledger writer rather
   * than writing `userEvent.create` directly.
   *
   * Going through `record` is what gives these events an idempotency key. The
   * API path (`mission-progress.service.ts`) uses the same keys, so a mission
   * completed here and then PATCHed produces one row, not two. It also keeps
   * `source` spelled the same way as every other emitter.
   *
   * No recursion risk: `MISSION_*`/`CHALLENGE_*` are excluded from
   * `shouldEvaluateDerivedProgress`, so recording them cannot re-enter
   * evaluation.
   */
  private async emitDerivedEvent(
    db: Prisma.TransactionClient | PrismaService,
    input: {
      userId: string;
      kind: 'mission' | 'challenge';
      event: EventTypeValue;
      transition: 'started' | 'updated' | 'completed' | 'failed';
      code: string;
      id: string;
      progress: number;
      completed: boolean;
      /** The attempt's start time; scopes the key to this attempt. */
      startedAt: Date | null;
    },
  ): Promise<void> {
    const isMission = input.kind === 'mission';
    // The same helper mission-/challenge-progress.service.ts use, so the two
    // paths deduplicate against each other.
    const idempotencyKey = progressEventKey(input);

    await this.getRecorder().record(
      {
        userId: input.userId,
        eventType: input.event,
        source: isMission ? EventSource.MISSION : EventSource.CHALLENGE,
        metadata: {
          [isMission ? 'missionId' : 'challengeId']: input.id,
          [isMission ? 'missionCode' : 'challengeCode']: input.code,
          source: 'RULE_ENGINE',
          body: {
            progress: input.progress,
            completed: input.completed,
          },
        },
        idempotencyKey,
      },
      // Whatever client the evaluation is running on — the caller's transaction
      // when there is one, so the event lands atomically with the progress row
      // it describes.
      db,
    );
  }

  private buildState(
    entry: RuleEntry,
    status: ProgressStatus,
    progress: number,
    completed: boolean,
    ruleHash: string,
  ): Prisma.JsonObject {
    return {
      ruleCode: entry.code,
      shape: entry.shape,
      status,
      progress,
      completed,
      ruleHash,
    };
  }

  private shouldIgnoreEventType(eventType: string): boolean {
    return (
      eventType.startsWith('MISSION_') ||
      eventType.startsWith('CHALLENGE_') ||
      eventType.startsWith('QUEST_') ||
      eventType.startsWith('WALLET_') ||
      eventType.startsWith('BADGE_') ||
      eventType.startsWith('PROGRESS_INDICATOR_')
    );
  }

  private async getActiveQuestScope(
    db: Prisma.TransactionClient | PrismaService,
    userId: string,
  ): Promise<ActiveQuestScope> {
    const row = await db.user.findUnique({
      where: { id: userId },
      select: {
        currentQuest: {
          where: { available: true },
          select: {
            items: {
              where: {
                contentType: {
                  in: ['MISSION', 'CHALLENGE'],
                },
              },
              select: {
                contentType: true,
                contentCode: true,
              },
            },
          },
        },
      },
    });

    const missionCodes = new Set<string>();
    const challengeCodes = new Set<string>();

    for (const item of row?.currentQuest?.items ?? []) {
      if (item.contentType === 'MISSION') {
        missionCodes.add(item.contentCode);
        continue;
      }
      if (item.contentType === 'CHALLENGE') {
        challengeCodes.add(item.contentCode);
      }
    }

    return { missionCodes, challengeCodes };
  }

  private async getScopedMissionProgress(
    db: Prisma.TransactionClient | PrismaService,
    userId: string,
    missionCatalog: CatalogItem[],
    activeScope: ActiveQuestScope,
  ): Promise<Map<string, ScopedProgress>> {
    const scopedIds = missionCatalog
      .filter((item) => activeScope.missionCodes.has(item.code))
      .map((item) => item.id);

    if (scopedIds.length === 0) {
      return new Map();
    }

    const rows = await db.missionProgress.findMany({
      where: { userId, missionId: { in: scopedIds } },
      select: { missionId: true, status: true, startedAt: true },
    });

    return new Map(
      rows.map((row) => [
        row.missionId,
        { status: row.status, startedAt: row.startedAt },
      ]),
    );
  }

  private async getScopedChallengeProgress(
    db: Prisma.TransactionClient | PrismaService,
    userId: string,
    challengeCatalog: CatalogItem[],
    activeScope: ActiveQuestScope,
  ): Promise<Map<string, ScopedProgress>> {
    const scopedIds = challengeCatalog
      .filter((item) => activeScope.challengeCodes.has(item.code))
      .map((item) => item.id);

    if (scopedIds.length === 0) {
      return new Map();
    }

    const rows = await db.challengeProgress.findMany({
      where: { userId, challengeId: { in: scopedIds } },
      select: { challengeId: true, status: true, startedAt: true },
    });

    return new Map(
      rows.map((row) => [
        row.challengeId,
        { status: row.status, startedAt: row.startedAt },
      ]),
    );
  }

  /**
   * The widest lookback any active rule needs. Bounds the single event query
   * that feeds every rule in one evaluation, so one long window does not turn
   * into a full-ledger scan for the short ones.
   */
  private getMaxWindowDays(rules: RulesCoverageDoc): number {
    const definitions = [...rules.missions, ...rules.challenges]
      .filter((entry) => entry.shape !== 'undecided' && entry.rule)
      .map((entry) => entry.rule as RuleDefinition);
    // `lifetime` is rejected by the mission/challenge schema, so this is never
    // null here; the fallback keeps the type honest.
    return maxWindowDays(definitions) ?? 7;
  }
}
