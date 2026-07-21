import { Injectable } from '@nestjs/common';
import { Prisma, ProgressPrecision, User, UserSegment } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GamificationEventType } from '../gamification.constants';
import {
  OnboardingBaselines,
  SOFT_PROGRESS_INDICATOR_KINDS,
  deriveUserSegment,
  targetForSegment,
} from '../onboarding.utils';
import { assertProgressIndicatorOwner } from '../progress-indicator.utils';

export function onboardingCompletedIdempotencyKey(userId: string): string {
  return `onboarding-completed:${userId}`;
}

export interface CompleteOnboardingResult {
  segment: UserSegment;
  indicatorsSeeded: number;
  walletEnsured: boolean;
  onboardingEventRecorded: boolean;
  /** True when ONBOARDING_COMPLETED already existed — no wallet/indicator writes. */
  skipped: boolean;
}

@Injectable()
export class GamificationOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  deriveSegment(baselines: OnboardingBaselines): UserSegment {
    return deriveUserSegment(baselines);
  }

  /**
   * First-time onboarding only: ensure wallet, seed soft indicators, and
   * record ONBOARDING_COMPLETED in a single transaction.
   * Later baseline PATCHes no-op once that event exists (targets are not rewritten).
   */
  async applyOnboardingSideEffects(
    user: Pick<User, 'id'>,
    segment: UserSegment,
  ): Promise<CompleteOnboardingResult> {
    assertProgressIndicatorOwner({ userId: user.id });

    const idempotencyKey = onboardingCompletedIdempotencyKey(user.id);

    const existing = await this.prisma.gamificationEvent.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return {
        segment,
        indicatorsSeeded: 0,
        walletEnsured: false,
        onboardingEventRecorded: false,
        skipped: true,
      };
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const again = await tx.gamificationEvent.findUnique({
          where: { idempotencyKey },
        });
        if (again) {
          return {
            segment,
            indicatorsSeeded: 0,
            walletEnsured: false,
            onboardingEventRecorded: false,
            skipped: true,
          };
        }

        await tx.userGamificationWallet.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id, level: 1, xp: 0, points: 0 },
        });

        const targetValue = targetForSegment(segment);
        let indicatorsSeeded = 0;

        for (const kind of SOFT_PROGRESS_INDICATOR_KINDS) {
          await tx.progressIndicator.upsert({
            where: {
              userId_kind: { userId: user.id, kind },
            },
            update: {
              precision: ProgressPrecision.SOFT,
              targetValue,
            },
            create: {
              userId: user.id,
              kind,
              precision: ProgressPrecision.SOFT,
              level: 1,
              accumulatedValue: 0,
              targetValue,
              allTimeTotal: 0,
            },
          });
          indicatorsSeeded += 1;
        }

        await tx.gamificationEvent.create({
          data: {
            userId: user.id,
            eventType: GamificationEventType.ONBOARDING_COMPLETED,
            subjectType: 'USER',
            subjectId: user.id,
            payload: { segment, indicatorsSeeded },
            idempotencyKey,
          },
        });

        return {
          segment,
          indicatorsSeeded,
          walletEnsured: true,
          onboardingEventRecorded: true,
          skipped: false,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return {
          segment,
          indicatorsSeeded: 0,
          walletEnsured: false,
          onboardingEventRecorded: false,
          skipped: true,
        };
      }
      throw error;
    }
  }
}
