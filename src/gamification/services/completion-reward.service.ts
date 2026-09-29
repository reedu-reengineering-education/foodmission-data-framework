import { Injectable, Logger } from '@nestjs/common';
import { WalletCurrency } from '@prisma/client';
import {
  AwardCompletionInput,
  CompletionRewardAwarder,
  CompletionRewardResult,
} from '../completion-reward.types';
import { GamificationWalletService } from './gamification-wallet.service';

@Injectable()
export class CompletionRewardService implements CompletionRewardAwarder {
  private readonly logger = new Logger(CompletionRewardService.name);

  constructor(private readonly walletService: GamificationWalletService) {}

  /**
   * Credits a completed entity's reward to the user's gamification wallet.
   *
   * Callers decide whether this is the first completion. Double-crediting is
   * prevented regardless: `GamificationWalletService.award` derives a
   * deterministic idempotency key from (user, sourceType, sourceId, reward,
   * currency), so a second call replays instead of paying twice — including a
   * call from a different code path, e.g. the rule evaluator completing a
   * mission the API PATCH path already paid for.
   *
   * Best-effort: a wallet failure must not fail the caller, whose progress row
   * is already persisted.
   */
  async awardCompletion(
    input: AwardCompletionInput,
  ): Promise<CompletionRewardResult | null> {
    const label = `${this.toSentenceCase(input.sourceType)} ${input.code}`;

    if (!input.reward) {
      this.logger.debug(`${label} has no reward attached`);
      return null;
    }

    const { reward } = input;
    const base = {
      userId: input.userId,
      rewardId: reward.id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      reason: `${label} completed`,
    };

    try {
      if (reward.xp) {
        await this.walletService.award({
          ...base,
          currency: WalletCurrency.XP,
          amount: reward.xp,
        });
      }
      if (reward.points) {
        await this.walletService.award({
          ...base,
          currency: WalletCurrency.POINTS,
          amount: reward.points,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to award ${label} reward to user ${input.userId}`,
        error instanceof Error ? error.stack : error,
      );
      return null;
    }

    return { xp: reward.xp, points: reward.points };
  }

  /** `CHALLENGE` -> `Challenge`, preserving the pre-extraction wallet reason text. */
  private toSentenceCase(value: string): string {
    return value.charAt(0) + value.slice(1).toLowerCase();
  }
}
