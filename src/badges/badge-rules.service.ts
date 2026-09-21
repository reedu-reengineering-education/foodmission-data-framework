import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { Prisma, RewardSourceType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  AfterCommitQueue,
  AfterCommitTask,
} from '../common/after-commit/after-commit.queue';
import { ProgressStatus } from '../common/progress-status';
import {
  EventSource,
  EventSubjectType,
  EventType,
} from '../events/event-types';
import {
  USER_EVENT_RECORDER,
  UserEventRecorder,
} from '../events/user-event-recorder.types';
import {
  COMPLETION_REWARD_AWARDER,
  CompletionRewardAwarder,
  CompletionRewardRef,
} from '../gamification/completion-reward.types';
import {
  collectEventTypes,
  evaluateRule,
  hashRule,
  maxWindowDays,
  UserEventRow,
} from '../rules/rule-evaluator';
import {
  BadgeRuleEntry,
  BadgeRulesDoc,
  badgeRulesSchema,
} from './badge-rule-schema';
import { BadgeRuleEvaluator } from './badge-rules.types';

type BadgeCatalogItem = {
  id: string;
  code: string;
  ruleCode: string;
};

/** A badge the evaluator just moved to COMPLETED for the first time. */
type BadgeAward = {
  userId: string;
  badgeId: string;
  code: string;
};

/**
 * Awards badges from the event ledger.
 *
 * The sibling of `RulesService`, sharing its rule dialect and evaluator, but
 * scoped differently in every way that matters:
 *
 * | | missions/challenges | badges |
 * |---|---|---|
 * | scope | the user's active quest | the whole account |
 * | window | days, bounded | lifetime |
 * | triggers on | behavioural events | those *and* MISSION_/QUEST_COMPLETED |
 * | writes | mission_progress, derived progress events | badge_progress, BADGE_EARNED |
 *
 * That third row is why this cannot be another section of the mission rules
 * file: `RulesService` drops `MISSION_*` and `QUEST_*` before it looks at
 * anything, and it must keep doing so — those events are its own output.
 * Badges, by contrast, are mostly *about* them.
 */
@Injectable()
export class BadgeRulesService implements OnModuleInit, BadgeRuleEvaluator {
  private readonly logger = new Logger(BadgeRulesService.name);
  private readonly rulesPath = join(
    process.cwd(),
    'prisma',
    'seeds',
    'data',
    'rules',
    'badges.rules.yml',
  );

  private loadedRules?: BadgeRulesDoc;
  private catalog?: BadgeCatalogItem[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly afterCommit: AfterCommitQueue,
    @Inject(USER_EVENT_RECORDER)
    private readonly recorder: UserEventRecorder,
    @Inject(COMPLETION_REWARD_AWARDER)
    private readonly awarder: CompletionRewardAwarder,
  ) {}

  onModuleInit(): void {
    this.load();
  }

  load(): BadgeRulesDoc {
    if (this.loadedRules) {
      return this.loadedRules;
    }

    const raw = yaml.load(readFileSync(this.rulesPath, 'utf8'));
    const validated = badgeRulesSchema.validate(raw, {
      abortEarly: false,
      allowUnknown: false,
    });

    if (validated.error) {
      throw new Error(
        `Invalid badge rules: ${validated.error.details
          .map((detail) => `${detail.message} @ ${detail.path.join('.')}`)
          .join('; ')}`,
      );
    }

    this.loadedRules = validated.value as BadgeRulesDoc;
    this.logger.log(`Loaded badge rules: ${this.loadedRules.badges.length}`);
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

    // Only badges whose counters can actually see this event can have moved,
    // and this costs nothing — it is a scan of the loaded YAML. Most events
    // leave here without touching the database at all.
    const triggered = this.load().badges.filter((entry) =>
      this.countsEventType(entry, eventType),
    );
    if (triggered.length === 0) {
      return;
    }

    const db = tx ?? this.prisma;
    const catalog = await this.getCatalog(db);
    const badgeByRuleCode = new Map(
      catalog.map((badge) => [badge.ruleCode, badge]),
    );

    const pending: { entry: BadgeRuleEntry; badge: BadgeCatalogItem }[] = [];
    for (const entry of triggered) {
      const badge = badgeByRuleCode.get(entry.code);
      // A rule with no seeded badge is not an error: the YAML can describe a
      // badge before the catalog row exists, or after it is retired.
      if (badge) {
        pending.push({ entry, badge });
      }
    }
    if (pending.length === 0) {
      return;
    }

    const earned = await this.getEarnedBadgeIds(
      db,
      userId,
      pending.map(({ badge }) => badge.id),
    );
    const unearned = pending.filter(({ badge }) => !earned.has(badge.id));
    if (unearned.length === 0) {
      return;
    }

    const events = await this.loadEvents(
      db,
      userId,
      unearned.map(({ entry }) => entry),
    );

    const awards: BadgeAward[] = [];
    for (const { entry, badge } of unearned) {
      const award = await this.syncProgress(db, events, userId, badge, entry);
      if (award) {
        awards.push(award);
      }
    }

    if (awards.length === 0) {
      return;
    }

    const tasks = awards.map((award) => this.toAwardTask(award));

    if (tx) {
      // The progress rows above are still uncommitted, and awarding opens its
      // own transactions (the wallet takes `FOR UPDATE` on its row). Running
      // that from inside the caller's transaction deadlocks on a second
      // connection. Hand it off instead — same reasoning as RulesService.
      this.afterCommit.schedule(tasks);
      return;
    }

    await this.afterCommit.run(tasks);
  }

  /**
   * Resolves once every award scheduled so far has settled. For tests and
   * graceful shutdown — the request path never waits on this.
   */
  async awaitPendingAwards(): Promise<void> {
    await this.afterCommit.awaitIdle();
  }

  /**
   * BADGE_EARNED is this service's own output, so counting it would be a loop
   * waiting for a rule to reference it. Wallet and indicator events are
   * bookkeeping that no badge is about. Everything else — including the
   * MISSION_/QUEST_ events RulesService drops — is fair game.
   */
  private shouldIgnoreEventType(eventType: string): boolean {
    return (
      eventType.startsWith('BADGE_') ||
      eventType.startsWith('WALLET_') ||
      eventType.startsWith('PROGRESS_INDICATOR_')
    );
  }

  private countsEventType(entry: BadgeRuleEntry, eventType: string): boolean {
    return collectEventTypes([entry.rule]).has(eventType);
  }

  /**
   * Reads just the event types the pending rules count, unbounded in time when
   * any of their windows is `lifetime` — which today all of them are. The type
   * filter is what keeps that honest: it is a handful of rows per user on the
   * `user_events` index, not the whole ledger.
   */
  private async loadEvents(
    db: Prisma.TransactionClient | PrismaService,
    userId: string,
    entries: BadgeRuleEntry[],
  ): Promise<UserEventRow[]> {
    const definitions = entries.map((entry) => entry.rule);
    const eventTypes = [...collectEventTypes(definitions)];
    const days = maxWindowDays(definitions);

    const where: Prisma.UserEventWhereInput = {
      userId,
      eventType: { in: eventTypes },
    };

    if (days !== null) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      where.createdAt = { gte: since };
    }

    return await db.userEvent.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: { eventType: true, createdAt: true, metadata: true },
    });
  }

  /**
   * Scores one badge and writes its progress row. Returns the award only on
   * the transition into completion, so a replayed evaluation never re-awards.
   */
  private async syncProgress(
    db: Prisma.TransactionClient | PrismaService,
    events: UserEventRow[],
    userId: string,
    badge: BadgeCatalogItem,
    entry: BadgeRuleEntry,
  ): Promise<BadgeAward | null> {
    const { completed, progress, counters } = evaluateRule(entry.rule, events);

    const previous = await db.badgeProgress.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      select: { progress: true, completed: true },
    });

    // Nothing yet and nothing to show: don't litter the table with zero rows
    // for every badge the user has not started.
    if (!previous && progress <= 0 && !completed) {
      return null;
    }

    const unchanged =
      previous != null &&
      previous.progress === progress &&
      previous.completed === completed;
    if (unchanged) {
      return null;
    }

    const status = completed
      ? ProgressStatus.COMPLETED
      : progress > 0
        ? ProgressStatus.IN_PROGRESS
        : ProgressStatus.NOT_STARTED;
    const ruleHash = hashRule(entry.rule);
    const row = {
      progress,
      completed,
      status,
      // The counters and the target are what make a percentage explainable
      // later without replaying the ledger.
      state: {
        ruleCode: entry.code,
        shape: entry.shape,
        status,
        progress,
        completed,
        counters,
        target: entry.rule.target,
        ruleHash,
      } satisfies Prisma.JsonObject,
      ruleHash,
      evaluatedAt: new Date(),
    };

    await db.badgeProgress.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      create: { userId, badgeId: badge.id, ...row },
      update: row,
    });

    if (!completed || previous?.completed) {
      return null;
    }

    return { userId, badgeId: badge.id, code: badge.code };
  }

  private toAwardTask(award: BadgeAward): AfterCommitTask {
    return {
      label: `badge ${award.code} for user ${award.userId}`,
      confirm: () => this.confirmCompleted(award),
      run: () => this.grantBadge(award),
    };
  }

  /**
   * Re-reads the progress row on the base client, so a badge is only granted
   * once the evaluation that completed it is actually committed.
   */
  private async confirmCompleted(award: BadgeAward): Promise<boolean> {
    const row = await this.prisma.badgeProgress.findUnique({
      where: {
        userId_badgeId: { userId: award.userId, badgeId: award.badgeId },
      },
      select: { completed: true },
    });
    return row?.completed === true;
  }

  /**
   * Grants the badge, then records it, then pays for it — in that order, and
   * each step idempotent on its own, so a crash between any two of them heals
   * on the next evaluation rather than double-paying.
   */
  private async grantBadge(award: BadgeAward): Promise<void> {
    // user_earned_badges has a foreign key to the wallet as well as to the
    // user, so a user who has never earned anything needs the wallet row first.
    await this.prisma.userGamificationWallet.upsert({
      where: { userId: award.userId },
      update: {},
      create: { userId: award.userId, xp: 0, points: 0 },
    });

    const reward = await this.loadReward(award.badgeId);

    await this.prisma.userEarnedBadge.upsert({
      where: {
        userId_badgeId: { userId: award.userId, badgeId: award.badgeId },
      },
      create: {
        userId: award.userId,
        badgeId: award.badgeId,
        rewardId: reward?.id ?? null,
        sourceType: RewardSourceType.BADGE,
        sourceId: award.badgeId,
      },
      update: {},
    });

    await this.recorder.record({
      userId: award.userId,
      eventType: EventType.BADGE_EARNED,
      source: EventSource.GAME,
      metadata: {
        badgeId: award.badgeId,
        badgeCode: award.code,
        source: 'BADGE_RULES',
      },
      subject: { type: EventSubjectType.BADGE, id: award.badgeId },
      idempotencyKey: `badge-earned:${award.userId}:${award.badgeId}`,
    });

    // Optional: only badges with a Reward pointing at them pay XP or points.
    // `awardCompletion` is itself idempotent per (user, source, reward).
    await this.awarder.awardCompletion({
      userId: award.userId,
      sourceType: RewardSourceType.BADGE,
      sourceId: award.badgeId,
      code: award.code,
      reward,
    });
  }

  /**
   * The reward attached to this badge, read fresh at award time so an edited
   * xp/points value is honoured rather than a value cached at startup.
   */
  private async loadReward(
    badgeId: string,
  ): Promise<CompletionRewardRef | null> {
    return this.prisma.reward.findFirst({
      where: { badgeId },
      select: { id: true, xp: true, points: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async getEarnedBadgeIds(
    db: Prisma.TransactionClient | PrismaService,
    userId: string,
    badgeIds: string[],
  ): Promise<Set<string>> {
    const rows = await db.userEarnedBadge.findMany({
      where: { userId, badgeId: { in: badgeIds } },
      select: { badgeId: true },
    });
    return new Set(rows.map((row) => row.badgeId));
  }

  /**
   * Cached for the lifetime of the process: this is seed data, a dozen rows,
   * and it is read on most events. A newly seeded badge therefore needs a
   * restart to start awarding — the same trade RulesService makes for missions.
   * Only the immutable columns are cached; the reward is read at award time.
   */
  private async getCatalog(
    db: Prisma.TransactionClient | PrismaService,
  ): Promise<BadgeCatalogItem[]> {
    if (this.catalog) {
      return this.catalog;
    }

    const rows = await db.badge.findMany({
      where: { available: true, ruleCode: { not: null } },
      select: { id: true, code: true, ruleCode: true },
    });

    this.catalog = rows.map((row) => ({
      id: row.id,
      code: row.code,
      ruleCode: row.ruleCode as string,
    }));
    return this.catalog;
  }
}
