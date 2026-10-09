import { Injectable } from '@nestjs/common';
import { ContentLevel, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { inferDimensionLevel, nextLevel } from '../dimension-levels.config';
import { EventSource, EventType } from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';
import { ONBOARDING_SURVEY_FIELDS } from '../onboarding.utils';

type Db = PrismaService | Prisma.TransactionClient;

const LEVEL_ORDER = Object.values(ContentLevel);

const SURVEY_ANSWER_SELECT = Object.fromEntries(
  ONBOARDING_SURVEY_FIELDS.map((field) => [field, true]),
) as Record<(typeof ONBOARDING_SURVEY_FIELDS)[number], true>;

export interface DimensionLevelUp {
  dimensionCode: string;
  from: ContentLevel;
  to: ContentLevel;
}

export interface UserDimensionLevelView {
  dimensionId: string;
  dimensionCode: string;
  dimensionName: string;
  level: ContentLevel;
}

@Injectable()
export class DimensionLevelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userEventService: UserEventService,
  ) {}

  /**
   * Creates the missing per-dimension levels from the user's onboarding
   * answers; before the survey there are none, so every dimension starts as
   * BEGINNER. Safe to call repeatedly; existing rows are never touched, so
   * earned levels stick.
   */
  async ensureForUser(userId: string, db: Db = this.prisma): Promise<void> {
    const [user, dimensions, existing] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: SURVEY_ANSWER_SELECT,
      }),
      db.dimension.findMany({ select: { id: true, code: true } }),
      db.userDimensionLevel.findMany({
        where: { userId },
        select: { dimensionId: true },
      }),
    ]);
    if (!user) return;

    const have = new Set(existing.map((row) => row.dimensionId));
    const missing = dimensions.filter((d) => !have.has(d.id));
    if (missing.length === 0) return;

    await db.userDimensionLevel.createMany({
      data: missing.map((d) => ({
        userId,
        dimensionId: d.id,
        level: inferDimensionLevel(d.code, user),
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Called once at onboarding: raises every dimension to the level its survey
   * answers score. Never lowers one, so a level earned before the survey
   * (pre-survey rows start as BEGINNER) is kept.
   */
  async applySurveyLevels(userId: string, db: Db = this.prisma): Promise<void> {
    await this.ensureForUser(userId, db);
    const [user, rows] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: SURVEY_ANSWER_SELECT,
      }),
      db.userDimensionLevel.findMany({
        where: { userId },
        select: {
          dimensionId: true,
          level: true,
          dimension: { select: { code: true } },
        },
      }),
    ]);
    if (!user) return;

    for (const row of rows) {
      const scored = inferDimensionLevel(row.dimension.code, user);
      if (LEVEL_ORDER.indexOf(scored) <= LEVEL_ORDER.indexOf(row.level)) {
        continue;
      }
      // Guarded on the old level, like levelUpIfComplete().
      await db.userDimensionLevel.updateMany({
        where: { userId, dimensionId: row.dimensionId, level: row.level },
        data: { level: scored },
      });
    }
  }

  /** The user's level in every dimension, in dimension display order. */
  async listForUser(userId: string): Promise<UserDimensionLevelView[]> {
    await this.ensureForUser(userId);
    const rows = await this.prisma.userDimensionLevel.findMany({
      where: { userId },
      include: { dimension: { select: { code: true, name: true } } },
      orderBy: { dimension: { sortOrder: 'asc' } },
    });
    return rows.map((row) => ({
      dimensionId: row.dimensionId,
      dimensionCode: row.dimension.code,
      dimensionName: row.dimension.name,
      level: row.level,
    }));
  }

  /**
   * Moves the dimension to the next level once every available quest at the
   * user's current level in it is completed. Called after a quest completes.
   * Returns null when nothing changed (quests left, ceiling, no level row).
   */
  async levelUpIfComplete(
    userId: string,
    dimensionId: string,
  ): Promise<DimensionLevelUp | null> {
    const row = await this.prisma.userDimensionLevel.findUnique({
      where: { userId_dimensionId: { userId, dimensionId } },
      select: { level: true, dimension: { select: { code: true } } },
    });
    const to = row ? nextLevel(row.level) : null;
    if (!row || !to) return null;

    const quests = await this.prisma.quest.findMany({
      where: { dimensionId, level: row.level, available: true },
      select: { id: true },
    });
    // A level with no quests can't be finished; don't skip past it silently.
    if (quests.length === 0) return null;

    const completed = await this.prisma.questProgress.count({
      where: {
        userId,
        completed: true,
        questId: { in: quests.map((q) => q.id) },
      },
    });
    if (completed < quests.length) return null;

    // Guarded on the old level, so two concurrent completions level up once.
    const { count } = await this.prisma.userDimensionLevel.updateMany({
      where: { userId, dimensionId, level: row.level },
      data: { level: to },
    });
    if (count === 0) return null;

    const levelUp = { dimensionCode: row.dimension.code, from: row.level, to };
    await this.userEventService.record({
      userId,
      eventType: EventType.DIMENSION_LEVEL_UP,
      source: EventSource.QUEST,
      metadata: levelUp,
      idempotencyKey: `dimension-level-up:${userId}:${dimensionId}:${to}`,
    });
    return levelUp;
  }
}
