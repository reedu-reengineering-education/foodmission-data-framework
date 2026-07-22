/** What happened — shared across app features. */
export const AppEventType = {
  LOGIN: 'LOGIN',
  ONBOARDING_COMPLETED: 'ONBOARDING_COMPLETED',
  POINTS_AWARDED: 'POINTS_AWARDED',
  XP_AWARDED: 'XP_AWARDED',
  CHALLENGE_COMPLETED: 'CHALLENGE_COMPLETED',
  MISSION_COMPLETED: 'MISSION_COMPLETED',
  QUEST_STARTED: 'QUEST_STARTED',
  QUEST_COMPLETED: 'QUEST_COMPLETED',
  INDICATOR_UPDATED: 'INDICATOR_UPDATED',
  BADGE_EARNED: 'BADGE_EARNED',
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
} as const;

export type AppEventTypeValue =
  (typeof AppEventType)[keyof typeof AppEventType];

/** Who produced the event (service / channel). */
export const EventSource = {
  API: 'api',
  ONBOARDING: 'onboarding',
  WALLET: 'wallet',
  SEED: 'seed',
  MEAL_LOG: 'meal_log',
} as const;

export type EventSourceValue = (typeof EventSource)[keyof typeof EventSource];
