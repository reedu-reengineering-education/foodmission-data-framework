import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { buildUserPreferences } from '../onboarding.utils';
import {
  toProgressIndicatorDto,
  toUserEventDto,
  toWalletDto,
  toWalletEntryDto,
} from '../gamification-profile.mapper';
import { GamificationProfileResponseDto } from '../dto/gamification-profile.dto';
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
}
