import { WalletCurrency } from '@prisma/client';

/** XP required per level (level = floor(xp / XP_PER_LEVEL) + 1). */
export const XP_PER_LEVEL = 100;

export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1);
}

export const GamificationEventType = {
  LOGIN: 'LOGIN',
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

export type GamificationEventTypeValue =
  (typeof GamificationEventType)[keyof typeof GamificationEventType];

export { WalletCurrency };
