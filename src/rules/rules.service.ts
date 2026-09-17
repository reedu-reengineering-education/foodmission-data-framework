import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import yaml from 'js-yaml';
import { PrismaService } from '../database/prisma.service';
import { ProgressStatus } from '../common/progress-status';
import { Prisma } from '@prisma/client';
import {
  RuleCounter,
  RuleDefinition,
  RuleEntry,
  RulesCoverageDoc,
  RuleWindow,
  rulesCoverageSchema,
} from './rule-schema';

type UserEventRow = {
  eventType: string;
  createdAt: Date;
  metadata: Prisma.JsonValue;
};

type CatalogItem = {
  id: string;
  code: string;
  reward?: { id: string; xp: number | null; points: number | null } | null;
};

type ActiveQuestScope = {
  missionCodes: Set<string>;
  challengeCodes: Set<string>;
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
    'drafts',
    'rules-coverage.draft.yml',
  );

  private loadedRules?: RulesCoverageDoc;
  private missionCatalog?: CatalogItem[];
  private challengeCatalog?: CatalogItem[];

  constructor(private readonly prisma: PrismaService) {}

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

    const rules = this.load();
    const db = tx ?? this.prisma;
    const activeScope = await this.getActiveQuestScope(db, userId);

    if (
      activeScope.missionCodes.size === 0 &&
      activeScope.challengeCodes.size === 0
    ) {
      return;
    }

    const maxWindowDays = this.getMaxWindowDays(rules);
    const since = new Date();
    since.setDate(since.getDate() - maxWindowDays);

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

    const missionCatalog = await this.getMissionCatalog(db);
    const challengeCatalog = await this.getChallengeCatalog(db);

    const missionRules = rules.missions.filter(
      (entry) =>
        entry.shape !== 'undecided' && activeScope.missionCodes.has(entry.code),
    );
    const challengeRules = rules.challenges.filter(
      (entry) =>
        entry.shape !== 'undecided' &&
        activeScope.challengeCodes.has(entry.code),
    );

    const completedMissionIds = await this.getCompletedMissionIds(
      db,
      userId,
      missionCatalog,
      activeScope,
    );
    const completedChallengeIds = await this.getCompletedChallengeIds(
      db,
      userId,
      challengeCatalog,
      activeScope,
    );

    for (const entry of missionRules) {
      const catalogItem = missionCatalog.find(
        (item) => item.code === entry.code,
      );
      if (!catalogItem || !entry.rule) {
        continue;
      }
      if (completedMissionIds.has(catalogItem.id)) {
        continue;
      }
      await this.syncProgress(
        db,
        events,
        userId,
        catalogItem,
        entry,
        'mission',
      );
    }

    for (const entry of challengeRules) {
      const catalogItem = challengeCatalog.find(
        (item) => item.code === entry.code,
      );
      if (!catalogItem || !entry.rule) {
        continue;
      }
      if (completedChallengeIds.has(catalogItem.id)) {
        continue;
      }
      await this.syncProgress(
        db,
        events,
        userId,
        catalogItem,
        entry,
        'challenge',
      );
    }
  }

  private async getMissionCatalog(
    db: Prisma.TransactionClient | PrismaService,
  ): Promise<CatalogItem[]> {
    if (this.missionCatalog) {
      return this.missionCatalog;
    }

    const rows = await db.mission.findMany({
      where: { available: true },
      select: {
        id: true,
        code: true,
        reward: { select: { id: true, xp: true, points: true } },
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

    const rows = await db.challenge.findMany({
      where: { available: true },
      select: {
        id: true,
        code: true,
        reward: { select: { id: true, xp: true, points: true } },
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
  ): Promise<void> {
    const { completed, progress } = this.evaluateRule(
      entry.rule as RuleDefinition,
      events,
    );
    const ruleHash = this.hashRule(entry);
    const status = completed
      ? ProgressStatus.COMPLETED
      : progress > 0
        ? ProgressStatus.IN_PROGRESS
        : ProgressStatus.NOT_STARTED;

    if (progress <= 0 && !completed) {
      const previous =
        kind === 'mission'
          ? await db.missionProgress.findUnique({
              where: {
                userId_missionId: { userId, missionId: catalogItem.id },
              },
            })
          : await db.challengeProgress.findUnique({
              where: {
                userId_challengeId: { userId, challengeId: catalogItem.id },
              },
            });

      if (!previous) {
        return;
      }
    }

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
        event: kind === 'mission' ? 'MISSION_STARTED' : 'CHALLENGE_STARTED',
        code: entry.code,
        id: catalogItem.id,
        progress,
        completed,
      });
    } else if (updated) {
      await this.emitDerivedEvent(db, {
        userId,
        kind,
        event: kind === 'mission' ? 'MISSION_UPDATED' : 'CHALLENGE_UPDATED',
        code: entry.code,
        id: catalogItem.id,
        progress,
        completed,
      });
    }

    if (firstCompletion) {
      await this.emitDerivedEvent(db, {
        userId,
        kind,
        event: kind === 'mission' ? 'MISSION_COMPLETED' : 'CHALLENGE_COMPLETED',
        code: entry.code,
        id: catalogItem.id,
        progress,
        completed,
      });
    }
  }

  private async emitDerivedEvent(
    db: Prisma.TransactionClient | PrismaService,
    input: {
      userId: string;
      kind: 'mission' | 'challenge';
      event: string;
      code: string;
      id: string;
      progress: number;
      completed: boolean;
    },
  ): Promise<void> {
    await db.userEvent.create({
      data: {
        userId: input.userId,
        eventType: input.event,
        source: input.kind === 'mission' ? 'MISSION' : 'CHALLENGE',
        metadata: {
          [input.kind === 'mission' ? 'missionId' : 'challengeId']: input.id,
          [input.kind === 'mission' ? 'missionCode' : 'challengeCode']:
            input.code,
          source: 'RULE_ENGINE',
          body: {
            progress: input.progress,
            completed: input.completed,
          },
        },
      },
    });
  }

  private evaluateRule(
    rule: RuleDefinition,
    events: UserEventRow[],
  ): { progress: number; completed: boolean } {
    const evaluationAt = new Date();
    const counters = this.evaluateCounters(
      rule.counters,
      events,
      rule.window,
      evaluationAt,
    );
    const completed = this.asBoolean(
      this.evaluateExpression(rule.target, counters),
    );
    const progressValue = completed
      ? 100
      : this.normalizeProgress(
          this.evaluateExpression(rule.progress, counters),
        );

    return { progress: progressValue, completed };
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

  private hashRule(entry: RuleEntry): string {
    return createHash('sha256')
      .update(JSON.stringify(entry.rule ?? {}))
      .digest('hex');
  }

  private evaluateCounters(
    counters: Record<string, RuleCounter>,
    events: UserEventRow[],
    ruleWindow: RuleWindow,
    evaluationAt: Date,
  ): Record<string, number> {
    const values: Record<string, number> = {};
    for (const [name, counter] of Object.entries(counters)) {
      const matchedEvents = this.filterEvents(
        counter,
        events,
        ruleWindow,
        evaluationAt,
      );
      values[name] = matchedEvents.length;
    }
    return values;
  }

  private filterEvents(
    counter: RuleCounter,
    events: UserEventRow[],
    ruleWindow: RuleWindow = { type: 'since_start', days: 7 },
    evaluationAt: Date = new Date(),
  ): UserEventRow[] {
    const matched = events.filter((event) => {
      if (counter.event) {
        if (event.eventType !== counter.event) {
          return false;
        }
      } else if (!(counter.anyOf?.includes(event.eventType) ?? false)) {
        return false;
      }

      if (!counter.where) {
        return true;
      }

      return Object.entries(counter.where).every(([path, expected]) => {
        const value = this.getPathValue(event.metadata, path);
        return value === expected;
      });
    });

    const window = counter.window ?? ruleWindow;
    const windowed = matched.filter((event) =>
      this.isWithinWindow(event.createdAt, evaluationAt, window),
    );

    if (!counter.distinctBy) {
      return windowed;
    }

    const seen = new Set<string>();
    const deduped: UserEventRow[] = [];
    for (const event of windowed) {
      const distinctValue = this.getPathValue(
        event.metadata,
        counter.distinctBy,
      );
      if (distinctValue == null) {
        deduped.push(event);
        continue;
      }
      if (
        typeof distinctValue !== 'string' &&
        typeof distinctValue !== 'number' &&
        typeof distinctValue !== 'boolean'
      ) {
        deduped.push(event);
        continue;
      }
      const key = String(distinctValue);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push(event);
    }
    return deduped;
  }

  private isWithinWindow(
    createdAt: Date,
    evaluationAt: Date,
    window?: RuleWindow,
  ): boolean {
    if (!window) {
      return true;
    }
    const offsetDays = window.offsetDays ?? 0;
    const windowEnd = new Date(evaluationAt);
    windowEnd.setDate(windowEnd.getDate() - offsetDays);
    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - window.days);
    return createdAt >= windowStart && createdAt <= windowEnd;
  }

  private getPathValue(value: Prisma.JsonValue, path: string): unknown {
    const normalizedPath = path.startsWith('metadata.')
      ? path.slice('metadata.'.length)
      : path;
    const parts = normalizedPath.split('.');
    let current: unknown = value;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private evaluateExpression(
    expression: string,
    context: Record<string, number>,
  ): unknown {
    this.assertSafeExpression(expression);
    const scope = {
      ...context,
      min: Math.min,
      max: Math.max,
      clamp: (value: number, lower: number, upper: number): number =>
        Math.min(Math.max(value, lower), upper),
    } as const;
    return runInNewContext(
      `'use strict'; (${expression});`,
      { ...scope },
      { timeout: 50 },
    );
  }

  private assertSafeExpression(expression: string): void {
    if (!/^[0-9A-Za-z_\s().,+\-*/%<>=!&|?:]+$/.test(expression)) {
      throw new Error(`Unsafe rule expression rejected: ${expression}`);
    }
  }

  private normalizeProgress(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    const scaled = numeric <= 1 ? numeric * 100 : numeric;
    return Math.max(0, Math.min(100, scaled));
  }

  private asBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value > 0;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
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

  private async getCompletedMissionIds(
    db: Prisma.TransactionClient | PrismaService,
    userId: string,
    missionCatalog: CatalogItem[],
    activeScope: ActiveQuestScope,
  ): Promise<Set<string>> {
    const scopedIds = missionCatalog
      .filter((item) => activeScope.missionCodes.has(item.code))
      .map((item) => item.id);

    if (scopedIds.length === 0) {
      return new Set<string>();
    }

    const rows = await db.missionProgress.findMany({
      where: {
        userId,
        missionId: { in: scopedIds },
        status: ProgressStatus.COMPLETED,
      },
      select: {
        missionId: true,
      },
    });

    return new Set(rows.map((row) => row.missionId));
  }

  private async getCompletedChallengeIds(
    db: Prisma.TransactionClient | PrismaService,
    userId: string,
    challengeCatalog: CatalogItem[],
    activeScope: ActiveQuestScope,
  ): Promise<Set<string>> {
    const scopedIds = challengeCatalog
      .filter((item) => activeScope.challengeCodes.has(item.code))
      .map((item) => item.id);

    if (scopedIds.length === 0) {
      return new Set<string>();
    }

    const rows = await db.challengeProgress.findMany({
      where: {
        userId,
        challengeId: { in: scopedIds },
        status: ProgressStatus.COMPLETED,
      },
      select: {
        challengeId: true,
      },
    });

    return new Set(rows.map((row) => row.challengeId));
  }

  private getMaxWindowDays(rules: RulesCoverageDoc): number {
    const allRules = [...rules.missions, ...rules.challenges].filter(
      (entry) => entry.shape !== 'undecided' && entry.rule,
    );
    const counterWindows = allRules.flatMap((entry) =>
      Object.values(entry.rule?.counters ?? {}).map((counter) => {
        const window = counter.window ?? entry.rule?.window;
        return (window?.days ?? 7) + (window?.offsetDays ?? 0);
      }),
    );
    return Math.max(
      ...allRules.map((entry) => entry.rule?.window.days ?? 7),
      ...counterWindows,
      7,
    );
  }
}
