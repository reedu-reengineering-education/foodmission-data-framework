import { Injectable } from '@nestjs/common';
import {
  GamificationEvent,
  WalletCurrency,
  Prisma,
  UserGamificationWallet,
  WalletEntry,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  GamificationEventTypeValue,
  levelFromXp,
} from '../gamification.constants';

export interface RecordGamificationEventInput {
  userId: string;
  groupId?: string | null;
  eventType: GamificationEventTypeValue | string;
  subjectType?: string | null;
  subjectId?: string | null;
  payload?: Record<string, unknown>;
  idempotencyKey?: string | null;
}

export interface AwardWalletInput {
  userId: string;
  currency: WalletCurrency;
  amount: number;
  reason: string;
  /** When set, links the WalletEntry to an existing event. */
  eventId?: string | null;
  groupId?: string | null;
  /**
   * When awarding without a pre-created event, optionally create one.
   * Ignored if `eventId` is provided.
   */
  eventType?: string;
  subjectType?: string | null;
  subjectId?: string | null;
  payload?: Record<string, unknown>;
  idempotencyKey?: string | null;
}

export interface AwardWalletResult {
  wallet: UserGamificationWallet;
  entry: WalletEntry;
  event: GamificationEvent | null;
  /** True when an existing idempotencyKey short-circuited the write. */
  replayed: boolean;
}

@Injectable()
export class GamificationWalletService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureWallet(userId: string): Promise<UserGamificationWallet> {
    return this.prisma.userGamificationWallet.upsert({
      where: { userId },
      update: {},
      create: { userId, level: 1, xp: 0, points: 0 },
    });
  }

  async recordEvent(
    input: RecordGamificationEventInput,
  ): Promise<{ event: GamificationEvent; replayed: boolean }> {
    if (input.idempotencyKey) {
      const existing = await this.prisma.gamificationEvent.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return { event: existing, replayed: true };
      }
    }

    const event = await this.prisma.gamificationEvent.create({
      data: {
        userId: input.userId,
        groupId: input.groupId ?? null,
        eventType: input.eventType,
        subjectType: input.subjectType ?? null,
        subjectId: input.subjectId ?? null,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue,
        idempotencyKey: input.idempotencyKey ?? null,
      },
    });

    return { event, replayed: false };
  }

  /**
   * Credits/debits the wallet and appends a WalletEntry in one transaction.
   * Optionally creates (or reuses via idempotencyKey) a GamificationEvent.
   */
  async award(input: AwardWalletInput): Promise<AwardWalletResult> {
    if (input.amount === 0) {
      throw new Error('Wallet award amount must be non-zero');
    }

    if (input.idempotencyKey) {
      const existingEvent = await this.prisma.gamificationEvent.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { walletEntries: true },
      });
      if (existingEvent) {
        const entry = existingEvent.walletEntries.find(
          (e) => e.currency === input.currency && e.amount === input.amount,
        );
        const wallet = await this.ensureWallet(input.userId);
        if (!entry) {
          throw new Error(
            `Idempotent event ${input.idempotencyKey} exists without matching wallet entry`,
          );
        }
        return {
          wallet,
          entry,
          event: existingEvent,
          replayed: true,
        };
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let event: GamificationEvent | null = null;

      if (input.eventId) {
        event = await tx.gamificationEvent.findUniqueOrThrow({
          where: { id: input.eventId },
        });
      } else if (input.eventType || input.idempotencyKey) {
        event = await tx.gamificationEvent.create({
          data: {
            userId: input.userId,
            groupId: input.groupId ?? null,
            eventType: input.eventType ?? 'POINTS_AWARDED',
            subjectType: input.subjectType ?? null,
            subjectId: input.subjectId ?? null,
            payload: (input.payload ?? {
              currency: input.currency,
              amount: input.amount,
              reason: input.reason,
            }) as Prisma.InputJsonValue,
            idempotencyKey: input.idempotencyKey ?? null,
          },
        });
      }

      const wallet = await tx.userGamificationWallet.upsert({
        where: { userId: input.userId },
        update: {},
        create: { userId: input.userId, level: 1, xp: 0, points: 0 },
      });

      const nextXp =
        input.currency === WalletCurrency.XP
          ? wallet.xp + input.amount
          : wallet.xp;
      const nextPoints =
        input.currency === WalletCurrency.POINTS
          ? wallet.points + input.amount
          : wallet.points;

      if (nextXp < 0 || nextPoints < 0) {
        throw new Error('Wallet balance cannot go negative');
      }

      const balanceAfter =
        input.currency === WalletCurrency.XP ? nextXp : nextPoints;

      const entry = await tx.walletEntry.create({
        data: {
          userId: input.userId,
          currency: input.currency,
          amount: input.amount,
          balanceAfter,
          reason: input.reason,
          eventId: event?.id ?? null,
        },
      });

      const updatedWallet = await tx.userGamificationWallet.update({
        where: { userId: input.userId },
        data: {
          xp: nextXp,
          points: nextPoints,
          level: levelFromXp(nextXp),
        },
      });

      return { wallet: updatedWallet, entry, event, replayed: false };
    });
  }
}
