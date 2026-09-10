import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { buildUserPreferences } from '../onboarding.utils';
import {
  toProgressIndicatorDto,
  toUserEventDto,
  toWalletDto,
  toWalletEntryDto,
} from '../gamification-profile.mapper';
import {
  GamificationProfileResponseDto,
  WalletBalanceDto,
  UserEarnedRewardsDto,
} from '../dto/gamification-profile.dto';
import { BadgeService } from './badge.service';

@Injectable()
export class GamificationProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badgeService: BadgeService,
  ) {}

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
        userEvents: {
          orderBy: { createdAt: 'desc' },
          take: eventsLimit,
        },
        walletEntries: {
          orderBy: { createdAt: 'desc' },
          take: walletEntriesLimit,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const badges = await this.badgeService.listForUser(userId);

    return {
      userId: user.id,
      segment: user.segment,
      currentQuestId: user.currentQuestId,
      lastLoginAt: user.lastLoginAt,
      preferences: buildUserPreferences(user.preferences, user),
      wallet: toWalletDto(user.gamificationWallet),
      progressIndicators: user.progressIndicators.map(toProgressIndicatorDto),
      badges,
      recentEvents: user.userEvents.map(toUserEventDto),
      recentWalletEntries: user.walletEntries.map(toWalletEntryDto),
    };
  }

  /**
   * Get current user's wallet balance.
   */
  async getWalletBalance(userId: string): Promise<WalletBalanceDto> {
    const wallet = await this.prisma.userGamificationWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      // Return default wallet if user hasn't earned anything yet
      return {
        xp: 0,
        points: 0,
        updatedAt: new Date(),
      };
    }

    return {
      xp: wallet.xp,
      points: wallet.points,
      updatedAt: wallet.updatedAt,
    };
  }

  /**
   * Get user's earned rewards (badges with reward details).
   */
  async getEarnedRewards(
    userId: string,
    limit: number = 100,
  ): Promise<UserEarnedRewardsDto> {
    const wallet = await this.getWalletBalance(userId);

    const earnedBadges = await this.prisma.userEarnedBadge.findMany({
      where: { userId },
      include: {
        reward: {
          select: {
            id: true,
            name: true,
            points: true,
            xp: true,
            badgeId: true,
            avatarItem: true,
            petItem: true,
            collectible: true,
          },
        },
      },
      orderBy: { earnedAt: 'desc' },
      take: limit,
    });

    return {
      earnedRewards: earnedBadges
        .filter((eb) => eb.reward !== null)
        .map((eb) => ({
          id: eb.id,
          reward: eb.reward!,
          sourceType: eb.sourceType,
          sourceId: eb.sourceId,
          earnedAt: eb.earnedAt,
        })),
      wallet,
    };
  }
}
