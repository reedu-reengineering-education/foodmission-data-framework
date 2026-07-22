import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { buildUserPreferences } from '../onboarding.utils';
import { GamificationProfileResponseDto } from '../dto/gamification-profile.dto';

@Injectable()
export class GamificationProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfileForUserId(
    userId: string,
    options?: { eventsLimit?: number; walletEntriesLimit?: number },
  ): Promise<GamificationProfileResponseDto> {
    const eventsLimit = options?.eventsLimit ?? 20;
    const walletEntriesLimit = options?.walletEntriesLimit ?? 20;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        gamificationWallet: true,
        progressIndicators: {
          where: { groupId: null },
          orderBy: { kind: 'asc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [recentEvents, recentWalletEntries] = await Promise.all([
      this.prisma.userEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: eventsLimit,
      }),
      this.prisma.walletEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: walletEntriesLimit,
      }),
    ]);

    const wallet = user.gamificationWallet;

    return {
      userId: user.id,
      segment: user.segment,
      currentQuestId: user.currentQuestId,
      lastLoginAt: user.lastLoginAt,
      preferences: buildUserPreferences(user.preferences, user),
      wallet: wallet
        ? {
            level: wallet.level,
            xp: wallet.xp,
            points: wallet.points,
            updatedAt: wallet.updatedAt,
          }
        : null,
      progressIndicators: user.progressIndicators.map((row) => ({
        id: row.id,
        kind: row.kind,
        precision: row.precision,
        level: row.level,
        accumulatedValue: row.accumulatedValue,
        targetValue: row.targetValue,
        allTimeTotal: row.allTimeTotal,
        cycleStartedAt: row.cycleStartedAt,
        lastUpdatedAt: row.lastUpdatedAt,
      })),
      badges: [],
      recentEvents: recentEvents.map((event) => ({
        id: event.id,
        userId: event.userId,
        eventType: event.eventType,
        source: event.source,
        timestamp: event.createdAt,
        groupId: event.groupId,
        metadata:
          event.metadata &&
          typeof event.metadata === 'object' &&
          !Array.isArray(event.metadata)
            ? (event.metadata as Record<string, unknown>)
            : {},
      })),
      recentWalletEntries: recentWalletEntries.map((entry) => ({
        id: entry.id,
        currency: entry.currency,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        reason: entry.reason,
        eventId: entry.eventId,
        createdAt: entry.createdAt,
      })),
    };
  }
}
