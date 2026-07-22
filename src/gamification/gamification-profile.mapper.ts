import { UserEventDto } from '../events/dto/user-event.dto';
import { asObjectMetadata } from '../events/user-event.utils';
import {
  GamificationWalletDto,
  ProgressIndicatorDto,
  WalletEntryDto,
} from './dto/gamification-profile.dto';

export function toWalletDto(
  wallet: {
    level: number;
    xp: number;
    points: number;
    updatedAt: Date;
  } | null,
): GamificationWalletDto | null {
  if (!wallet) return null;
  return {
    level: wallet.level,
    xp: wallet.xp,
    points: wallet.points,
    updatedAt: wallet.updatedAt,
  };
}

export function toProgressIndicatorDto(row: {
  id: string;
  kind: string;
  precision: string;
  level: number;
  accumulatedValue: number;
  targetValue: number;
  allTimeTotal: number;
  cycleStartedAt: Date;
  lastUpdatedAt: Date;
}): ProgressIndicatorDto {
  return {
    id: row.id,
    kind: row.kind,
    precision: row.precision,
    level: row.level,
    accumulatedValue: row.accumulatedValue,
    targetValue: row.targetValue,
    allTimeTotal: row.allTimeTotal,
    cycleStartedAt: row.cycleStartedAt,
    lastUpdatedAt: row.lastUpdatedAt,
  };
}

export function toUserEventDto(event: {
  id: string;
  userId: string;
  eventType: string;
  source: string;
  groupId: string | null;
  metadata: unknown;
  createdAt: Date;
}): UserEventDto {
  return {
    id: event.id,
    userId: event.userId,
    eventType: event.eventType,
    source: event.source,
    timestamp: event.createdAt,
    groupId: event.groupId,
    metadata: asObjectMetadata(event.metadata),
  };
}

export function toWalletEntryDto(entry: {
  id: string;
  currency: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  eventId: string | null;
  createdAt: Date;
}): WalletEntryDto {
  return {
    id: entry.id,
    currency: entry.currency,
    amount: entry.amount,
    balanceAfter: entry.balanceAfter,
    reason: entry.reason,
    eventId: entry.eventId,
    createdAt: entry.createdAt,
  };
}
