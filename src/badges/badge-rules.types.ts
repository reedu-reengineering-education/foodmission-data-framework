/**
 * Leaf module: contract and DI token for badge evaluation.
 *
 * `UserEventService` triggers a badge evaluation after writing an event, but
 * `BadgeRulesService` depends (through GamificationModule) on
 * `UserEventService` itself — it records BADGE_EARNED and credits the wallet.
 * Depending on this file, which imports nothing of ours, keeps that from
 * becoming an import cycle. Same shape as QUEST_PROGRESS_RECOMPUTER.
 */

/** The freshly written event a badge evaluation reacts to. */
export interface BadgeTrigger {
  userId: string;
  eventType: string;
  /** Used to tell when the writer's transaction has committed. */
  eventId: string;
}

export interface BadgeRuleEvaluator {
  /**
   * Re-scores every unearned badge whose rule counts `trigger.eventType`,
   * writes the progress rows and grants any badge that is complete.
   *
   * Never runs a statement on the caller's transaction. With `afterCommit`,
   * the work is queued until the triggering event is visible on the base
   * client and this returns straight away; otherwise it runs now.
   */
  evaluateUserEvent(
    trigger: BadgeTrigger,
    options?: { afterCommit?: boolean },
  ): Promise<void>;
}

export const BADGE_RULE_EVALUATOR = Symbol('BADGE_RULE_EVALUATOR');
