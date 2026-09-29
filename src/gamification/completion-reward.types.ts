import { RewardSourceType } from '@prisma/client';

/**
 * Leaf module: contract and DI token for crediting the reward attached to a
 * completable entity — missions and challenges today, quests when they grow
 * rewards of their own.
 *
 * The dependency between rules and gamification is cyclic (rules ->
 * gamification -> events -> rules, because the wallet writes UserEvents and
 * UserEvents drive rule evaluation). Nest's `forwardRef` handles the *module*
 * cycle, but a cyclic `import` between the service files is still a real
 * load-order hazard — whichever file Node reaches first gets a half-built
 * partner, and `design:paramtypes` silently records `undefined`.
 *
 * So consumers depend on this file, which imports nothing of ours, instead of
 * importing the implementation directly.
 */

/** The reward attached to a completable entity, as selected from the catalog. */
export interface CompletionRewardRef {
  id: string;
  xp: number | null;
  points: number | null;
}

export interface AwardCompletionInput {
  userId: string;
  sourceType: RewardSourceType;
  sourceId: string;
  /** The entity's code, used for the wallet entry reason and log lines. */
  code: string;
  reward?: CompletionRewardRef | null;
}

export interface CompletionRewardResult {
  xp: number | null;
  points: number | null;
}

export interface CompletionRewardAwarder {
  awardCompletion(
    input: AwardCompletionInput,
  ): Promise<CompletionRewardResult | null>;
}

export const COMPLETION_REWARD_AWARDER = Symbol('COMPLETION_REWARD_AWARDER');
