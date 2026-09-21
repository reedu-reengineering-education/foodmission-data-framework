import { Prisma } from '@prisma/client';

/**
 * Leaf module: contract and DI token for badge evaluation.
 *
 * `UserEventService` triggers a badge evaluation after writing an event, but
 * `BadgeRulesService` depends (through GamificationModule) on
 * `UserEventService` itself — it records BADGE_EARNED and credits the wallet.
 * Depending on this file, which imports nothing of ours, keeps that from
 * becoming an import cycle. Same shape as QUEST_PROGRESS_RECOMPUTER.
 */

export interface BadgeRuleEvaluator {
  /**
   * Re-scores every unearned badge whose rule counts `eventType`, writes the
   * progress rows, and hands any newly completed badge to the after-commit
   * queue to be awarded. Awaited by the caller only so the progress rows land
   * in the same transaction; the awarding never does work on `tx`.
   */
  evaluateUserEvent(
    userId: string,
    eventType: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;
}

export const BADGE_RULE_EVALUATOR = Symbol('BADGE_RULE_EVALUATOR');
