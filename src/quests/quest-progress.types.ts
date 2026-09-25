/**
 * Leaf module: contract and DI token for quest progress recomputation.
 *
 * `UserEventService` triggers a recompute after writing a completion event, but
 * `QuestProgressService` depends (through GamificationModule) on
 * `UserEventService` itself. Depending on this file instead of the
 * implementation keeps that from becoming an import cycle.
 */

/** The completion signal that triggered a recompute. */
export interface QuestTriggerEvent {
  userId: string;
  /** The just-written UserEvent row; used to confirm the writer committed. */
  eventId: string;
  eventType: string;
}

export interface QuestProgressRecomputer {
  /**
   * Fire-and-forget. Returns immediately, never throws, and does no database
   * work on the caller's connection — the recompute is deferred until after
   * the caller's transaction commits.
   */
  onCompletionEvent(trigger: QuestTriggerEvent): void;
}

export const QUEST_PROGRESS_RECOMPUTER = Symbol('QUEST_PROGRESS_RECOMPUTER');
