import { Injectable } from '@nestjs/common';
import { ProgressPrecision, User, UserSegment } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GamificationWalletService } from './gamification-wallet.service';
import { GamificationEventType } from '../gamification.constants';
import {
  OnboardingBaselines,
  SOFT_PROGRESS_INDICATOR_KINDS,
  deriveUserSegment,
  targetForSegment,
} from '../onboarding.utils';
import { assertProgressIndicatorOwner } from '../progress-indicator.utils';

export interface CompleteOnboardingResult {
  segment: UserSegment;
  indicatorsSeeded: number;
  walletEnsured: boolean;
  onboardingEventRecorded: boolean;
}

@Injectable()
export class GamificationOnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: GamificationWalletService,
  ) {}

  deriveSegment(baselines: OnboardingBaselines): UserSegment {
    return deriveUserSegment(baselines);
  }

  async seedSoftIndicatorsForUser(
    userId: string,
    segment: UserSegment,
  ): Promise<number> {
    assertProgressIndicatorOwner({ userId });
    const targetValue = targetForSegment(segment);
    let count = 0;

    for (const kind of SOFT_PROGRESS_INDICATOR_KINDS) {
      await this.prisma.progressIndicator.upsert({
        where: {
          userId_kind: { userId, kind },
        },
        update: {
          precision: ProgressPrecision.SOFT,
          targetValue,
        },
        create: {
          userId,
          kind,
          precision: ProgressPrecision.SOFT,
          level: 1,
          accumulatedValue: 0,
          targetValue,
          allTimeTotal: 0,
        },
      });
      count += 1;
    }

    return count;
  }

  async ensureWallet(userId: string): Promise<void> {
    await this.walletService.ensureWallet(userId);
  }

  async applyOnboardingSideEffects(
    user: Pick<User, 'id'>,
    segment: UserSegment,
  ): Promise<CompleteOnboardingResult> {
    await this.ensureWallet(user.id);
    const indicatorsSeeded = await this.seedSoftIndicatorsForUser(
      user.id,
      segment,
    );

    const { replayed } = await this.walletService.recordEvent({
      userId: user.id,
      eventType: GamificationEventType.ONBOARDING_COMPLETED,
      subjectType: 'USER',
      subjectId: user.id,
      payload: { segment, indicatorsSeeded },
      idempotencyKey: `onboarding-completed:${user.id}`,
    });

    return {
      segment,
      indicatorsSeeded,
      walletEnsured: true,
      onboardingEventRecorded: !replayed,
    };
  }
}
