import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { Prisma, RewardSourceType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AfterCommitQueue } from '../common/after-commit/after-commit.queue';
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
import { BadgeRuleEvaluator, BadgeTrigger } from './badge-rules.types';

type BadgeCatalogItem = {
  id: string;
  code: string;
  ruleCode: string;
};

/** A badge whose rule is complete but which the user has not been granted. */
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

  /**
   * Events that rescore every badge, not just those whose rule counts them.
   * This is the recovery path: it grants badges whose earlier grant failed,
   * scores events whose evaluation was lost before it wrote anything (e.g.
   * to a restart), and picks up history a rule can already see but no new
   * event has triggered yet — such as ONBOARDING_COMPLETED for FIRST_STEP.
   *
   * Login is recorded at most once per user per UTC day, but only on
   * `/auth/login`; app opens cover users who sign in with Keycloak directly.
   * Client-posted is fine here: rescoring only reads the server's ledger.
   * Cost is one ledger read across the badge event types plus a progress
   * lookup per unearned badge.
   */
  static readonly RESCORE_ALL_EVENTS: ReadonlySet<string> = new Set([
    EventType.USER_LOGGED_IN,
    EventType.APP_SESSION_OPENED,
  ]);

  /** How long the badge catalog is trusted before it is read again. */
  static readonly CATALOG_TTL_MS = 60_000;

  private loadedRules?: BadgeRulesDoc;
  private catalog?: { items: BadgeCatalogItem[]; loadedAt: number };

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
    trigger: BadgeTrigger,
    options: { afterCommit?: boolean } = {},
  ): Promise<void> {
    const { userId, eventType, eventId } = trigger;
    if (this.shouldIgnoreEventType(eventType)) {
      return;
    }

    // Otherwise only badges whose counters can actually see this event can
    // have moved, and this costs nothing — it is a scan of the loaded YAML.
    // Most events leave here without touching the database at all.
    const rules = this.load().badges;
    const triggered = BadgeRulesService.RESCORE_ALL_EVENTS.has(eventType)
      ? rules
      : rules.filter((entry) => this.countsEventType(entry, eventType));
    if (triggered.length === 0) {
      return;
    }

    if (!options.afterCommit) {
      await this.evaluate(userId, triggered);
      return;
    }

    // The caller's transaction is still open. Nothing here may run on it:
    // a failed statement would abort the caller's transaction however it is
    // caught, and granting takes the wallet lock on a second connection. So
    // wait until the triggering event is visible, then score from scratch.
    // A rolled-back event never becomes visible and the task is skipped.
    this.afterCommit.schedule([
      {
        label: `badges on ${eventType} for user ${userId}`,
        confirm: () => this.isEventCommitted(eventId),
        run: () => this.evaluate(userId, triggered),
      },
    ]);
  }

  /**
   * Scores `entries` for the user and grants whatever is complete, including
   * badges an earlier evaluation completed but failed to grant.
   *
   * Scoring holds a per-user advisory lock, so two evaluations for the same
   * user run one after the other and the later one always reads a ledger at
   * least as new as the earlier one's — a slow, stale evaluation can no longer
   * overwrite a completed row with a lower score. Granting happens after that
   * transaction commits, on the base client.
   */
  private async evaluate(
    userId: string,
    entries: BadgeRuleEntry[],
  ): Promise<void> {
    const awards = await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`badges:${userId}`}, 0))`;
        return this.scoreBadges(tx, userId, entries);
      },
      // Waiting for the lock counts against the timeout, and a burst of events
      // for one user queues several evaluations behind each other.
      { timeout: 15_000 },
    );

    for (const award of awards) {
      try {
        await this.grantBadge(award);
      } catch (error) {
        // Not fatal: the badge stays unearned with a completed progress row,
        // so the next event this rule counts, or the next login or app open,
        // grants it again.
        this.logger.error(
          `Failed to grant badge ${award.code} to user ${userId}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }
  }

  private async scoreBadges(
    db: Prisma.TransactionClient,
    userId: string,
    entries: BadgeRuleEntry[],
  ): Promise<BadgeAward[]> {
    if (entries.length === 0) {
      return [];
    }

    const catalog = await this.getCatalog(db);
    const badgeByRuleCode = new Map(
      catalog.map((badge) => [badge.ruleCode, badge]),
    );

    const pending: { entry: BadgeRuleEntry; badge: BadgeCatalogItem }[] = [];
    for (const entry of entries) {
      const badge = badgeByRuleCode.get(entry.code);
      // A rule with no seeded badge is not an error: the YAML can describe a
      // badge before the catalog row exists, or after it is retired.
      if (badge) {
        pending.push({ entry, badge });
      }
    }
    if (pending.length === 0) {
      return [];
    }

    const earned = await this.getEarnedBadgeIds(
      db,
      userId,
      pending.map(({ badge }) => badge.id),
    );
    const unearned = pending.filter(({ badge }) => !earned.has(badge.id));
    if (unearned.length === 0) {
      return [];
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
    return awards;
  }

  /**
   * Resolves once every evaluation queued so far has settled. For tests and
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
   * Scores one badge and writes its progress row when it moved. Returns an
   * award whenever the rule is complete — the caller only passes badges the
   * user has not been granted, so a completed row without a grant (an earlier
   * grant failed or was lost) is retried rather than skipped forever.
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
      return completed ? { userId, badgeId: badge.id, code: badge.code } : null;
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

    return completed ? { userId, badgeId: badge.id, code: badge.code } : null;
  }

  /** True once the writer's transaction that created the event committed. */
  private async isEventCommitted(eventId: string): Promise<boolean> {
    const row = await this.prisma.userEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    return row !== null;
  }

  /**
   * Records the badge, pays for it, and only then marks it earned. Every step
   * is idempotent on its own, and the earned row is what stops re-evaluation,
   * so a failure anywhere before it leaves the badge unearned and the next
   * evaluation repeats the whole grant — replaying whatever already happened
   * instead of double-paying.
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
    // `awardCompletion` is idempotent per (user, source, reward), but it logs
    // and swallows wallet failures, returning null — which for a badge that
    // has a reward means nothing was paid, so stop before marking it earned.
    const paid = await this.awarder.awardCompletion({
      userId: award.userId,
      sourceType: RewardSourceType.BADGE,
      sourceId: award.badgeId,
      code: award.code,
      reward,
    });
    if (reward && !paid) {
      throw new Error(`Reward ${reward.id} was not paid`);
    }

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
   * Cached briefly: this is seed data, a dozen rows, read on most evaluations.
   * The expiry lets a badge seeded or retired on a running app take effect
   * within a minute, and an empty result is never cached, so an event that
   * arrives before the seed has run cannot switch badges off until a restart.
   * Only the immutable columns are cached; the reward is read at award time.
   */
  private async getCatalog(
    db: Prisma.TransactionClient | PrismaService,
  ): Promise<BadgeCatalogItem[]> {
    if (
      this.catalog &&
      Date.now() - this.catalog.loadedAt < BadgeRulesService.CATALOG_TTL_MS
    ) {
      return this.catalog.items;
    }

    const rows = await db.badge.findMany({
      where: { available: true, ruleCode: { not: null } },
      select: { id: true, code: true, ruleCode: true },
    });

    const items = rows.map((row) => ({
      id: row.id,
      code: row.code,
      ruleCode: row.ruleCode as string,
    }));
    this.catalog =
      items.length > 0 ? { items, loadedAt: Date.now() } : undefined;
    return items;
  }
}
