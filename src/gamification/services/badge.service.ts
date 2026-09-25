import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * The earned-badge slice of the gamification profile.
 *
 * Reads `user_earned_badges` directly rather than depending on BadgesModule:
 * that module depends on this one (through the reward awarder), so the arrow
 * only points one way. The richer per-user view, including locked badges and
 * their progress, is `GET /badges/me`.
 */
@Injectable()
export class BadgeService {
  constructor(private readonly prisma: PrismaService) {}

  /** Earned badge codes, oldest first. */
  async listForUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.userEarnedBadge.findMany({
      where: { userId },
      select: { badge: { select: { code: true } } },
      orderBy: { earnedAt: 'asc' },
    });

    return rows.map((row) => row.badge.code);
  }
}
