import { WalletCurrency } from '@prisma/client';
import {
  AppEventType,
  type AppEventTypeValue,
} from '../events/event-types';

/** XP required per level (level = floor(xp / XP_PER_LEVEL) + 1). */
export const XP_PER_LEVEL = 100;

export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1);
}

/** @deprecated Use AppEventType from events/event-types */
export const GamificationEventType = AppEventType;

export type GamificationEventTypeValue = AppEventTypeValue;

export { WalletCurrency };
