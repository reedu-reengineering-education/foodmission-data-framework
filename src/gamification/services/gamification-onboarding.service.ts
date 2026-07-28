import { Injectable } from '@nestjs/common';
import { Prisma, User, UserSegment } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EventSource, EventType } from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';

export function onboardingCompletedIdempotencyKey(userId: string): string {
  return `onboarding-completed:${userId}`;
}

export interface CompleteOnboardingResult {
  segment: UserSegment;
  walletEnsured: boolean;
  onboardingEventRecorded: boolean;
  /** True when ONBOARDING_COMPLETED already existed — no wallet write. */
  skipped: boolean;
}

@Injectable()
export class GamificationOnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userEventService: UserEventService,
  ) {}

  /**
   * First-time onboarding only: ensure wallet and record ONBOARDING_COMPLETED
   * in a single transaction. Later baseline PATCHes no-op once that event exists.
   * Progress-indicator seeding is deferred until product defines post-onboarding rules.
   */
  async applyOnboardingSideEffects(
    user: Pick<User, 'id'>,
    segment: UserSegment,
  ): Promise<CompleteOnboardingResult> {
    const idempotencyKey = onboardingCompletedIdempotencyKey(user.id);
    const skipped = {
      segment,
      walletEnsured: false,
      onboardingEventRecorded: false,
      skipped: true as const,
    };

    const existing =
      await this.userEventService.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return skipped;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.userGamificationWallet.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id, xp: 0, points: 0 },
        });

        await this.userEventService.record(
          {
            userId: user.id,
            eventType: EventType.ONBOARDING_COMPLETED,
            source: EventSource.ONBOARDING,
            metadata: { segment },
            idempotencyKey,
            subject: { type: 'USER', id: user.id },
          },
          tx,
        );

        return {
          segment,
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
        return skipped;
      }
      throw error;
    }
  }
}
