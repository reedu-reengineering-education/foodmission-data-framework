import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ProgressStatus } from '../../common/progress-status';
import {
  BadgeDto,
  BadgesResponseDto,
  UserBadgeDto,
  UserBadgesResponseDto,
} from '../dto/badge-response.dto';

type BadgeRow = {
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  ruleCode: string | null;
};

/**
 * Read model for badges. Everything here is a projection — the writes all
 * happen in BadgeRulesService, off the event ledger.
 */
@Injectable()
export class BadgesService {
  private static readonly BADGE_SELECT = {
    id: true,
    code: true,
    name: true,
    description: true,
    imageUrl: true,
    sortOrder: true,
    ruleCode: true,
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  /** The whole catalog, earned or not, in gallery order. */
  async listCatalog(): Promise<BadgesResponseDto> {
    const rows = await this.prisma.badge.findMany({
      where: { available: true },
      select: BadgesService.BADGE_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    return {
      badges: rows.map((row) => this.toBadgeDto(row)),
      total: rows.length,
    };
  }

  async getByCode(code: string): Promise<BadgeDto> {
    const row = await this.prisma.badge.findUnique({
      where: { code },
      select: BadgesService.BADGE_SELECT,
    });

    if (!row) {
      throw new NotFoundException(`Badge "${code}" not found`);
    }

    return this.toBadgeDto(row);
  }

  /**
   * The full catalog annotated for one user, so the client can render the
   * locked badges next to the earned ones without a second call.
   *
   * `earned` comes from UserEarnedBadge, which is the authoritative "has it"
   * record; `progress` comes from BadgeProgress, which may briefly read 100
   * before the after-commit award lands. Reporting both separately is honest
   * about that gap rather than papering over it.
   */
  async listForUser(userId: string): Promise<UserBadgesResponseDto> {
    const [rows, earned, progress] = await Promise.all([
      this.prisma.badge.findMany({
        where: { available: true },
        select: BadgesService.BADGE_SELECT,
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.userEarnedBadge.findMany({
        where: { userId },
        select: { badgeId: true, earnedAt: true },
      }),
      this.prisma.badgeProgress.findMany({
        where: { userId },
        select: {
          badgeId: true,
          progress: true,
          status: true,
          state: true,
        },
      }),
    ]);

    const earnedByBadgeId = new Map(
      earned.map((row) => [row.badgeId, row.earnedAt]),
    );
    const progressByBadgeId = new Map(
      progress.map((row) => [row.badgeId, row]),
    );

    const badges: UserBadgeDto[] = rows.map((row) => {
      const earnedAt = earnedByBadgeId.get(row.id) ?? null;
      const tracked = progressByBadgeId.get(row.id);
      const isEarned = earnedAt !== null;

      return {
        ...this.toBadgeDto(row),
        earned: isEarned,
        earnedAt,
        progress: isEarned ? 100 : (tracked?.progress ?? 0),
        status: isEarned
          ? ProgressStatus.COMPLETED
          : ((tracked?.status as ProgressStatus) ?? ProgressStatus.NOT_STARTED),
        counters: this.readCounters(tracked?.state),
      };
    });

    return {
      badges,
      earnedCount: badges.filter((badge) => badge.earned).length,
      totalCount: badges.length,
    };
  }

  private toBadgeDto(row: BadgeRow): BadgeDto {
    return {
      code: row.code,
      name: row.name,
      description: row.description,
      imageUrl: row.imageUrl,
      sortOrder: row.sortOrder,
      ruleCode: row.ruleCode,
    };
  }

  /**
   * `state.counters` as written by BadgeRulesService. Anything else in there
   * is ignored rather than trusted: the column is free-form JSON and older
   * rows predate the shape.
   */
  private readCounters(
    state: Prisma.JsonValue | undefined,
  ): Record<string, number> | null {
    if (state == null || typeof state !== 'object' || Array.isArray(state)) {
      return null;
    }
    const counters = (state as Record<string, unknown>).counters;
    if (
      counters == null ||
      typeof counters !== 'object' ||
      Array.isArray(counters)
    ) {
      return null;
    }

    const numeric: Record<string, number> = {};
    for (const [name, value] of Object.entries(counters)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        numeric[name] = value;
      }
    }
    return numeric;
  }
}
