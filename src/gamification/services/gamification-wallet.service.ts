import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  UserEvent,
  WalletCurrency,
  Prisma,
  UserGamificationWallet,
  WalletEntry,
  RewardSourceType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  EventSource,
  EventType,
  EventTypeValue,
} from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';

export interface AwardWalletInput {
  userId: string;
  currency: WalletCurrency;
  amount: number;
  reason: string;
  /** When set, links the WalletEntry to an existing event. */
  eventId?: string | null;
  groupId?: string | null;
  /** Links the entry to the reward that triggered this credit. */
  rewardId?: string | null;
  sourceType?: RewardSourceType | null;
  sourceId?: string | null;
  /**
   * When awarding without a pre-created event, optionally create one.
   * Ignored if `eventId` is provided.
   */
  eventType?: EventTypeValue;
  subjectType?: string | null;
  subjectId?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
}

export interface AwardWalletResult {
  wallet: UserGamificationWallet;
  entry: WalletEntry;
  event: UserEvent | null;
  /** True when an existing idempotencyKey short-circuited the write. */
  replayed: boolean;
}

type WalletRow = {
  userId: string;
  xp: number;
  points: number;
  updatedAt: Date;
};

/** Default ledger event kind when `award()` creates an event without an explicit `eventType`. */
export function defaultWalletAwardEventType(
  currency: WalletCurrency,
): EventTypeValue {
  return currency === WalletCurrency.XP
    ? EventType.WALLET_XP_AWARDED
    : EventType.WALLET_POINTS_AWARDED;
}

@Injectable()
export class GamificationWalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userEventService: UserEventService,
  ) {}

  private async ensureWallet(userId: string): Promise<UserGamificationWallet> {
    return this.prisma.userGamificationWallet.upsert({
      where: { userId },
      update: {},
      create: { userId, xp: 0, points: 0 },
    });
  }

  /**
   * Credits/debits the wallet and appends a WalletEntry in one transaction.
   * Locks the wallet row (FOR UPDATE) to avoid lost updates under concurrency.
   * Optionally creates (or reuses via idempotencyKey) a UserEvent.
   */
  async award(input: AwardWalletInput): Promise<AwardWalletResult> {
    if (input.amount === 0) {
      throw new BadRequestException('Wallet award amount must be non-zero');
    }

    const awardInput = {
      ...input,
      idempotencyKey: this.resolveIdempotencyKey(input),
    };

    if (awardInput.idempotencyKey) {
      const replayed = await this.tryReplayAward(awardInput);
      if (replayed) {
        return replayed;
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        let event: UserEvent | null = null;

        if (awardInput.eventId) {
          event = await tx.userEvent.findUniqueOrThrow({
            where: { id: awardInput.eventId },
          });
        } else if (awardInput.eventType || awardInput.idempotencyKey) {
          const recorded = await this.userEventService.record(
            {
              userId: awardInput.userId,
              groupId: awardInput.groupId,
              eventType:
                awardInput.eventType ??
                defaultWalletAwardEventType(awardInput.currency),
              source: EventSource.WALLET,
              metadata: awardInput.metadata ?? {
                currency: awardInput.currency,
                amount: awardInput.amount,
                reason: awardInput.reason,
              },
              idempotencyKey: awardInput.idempotencyKey,
              subject:
                awardInput.subjectType != null
                  ? { type: awardInput.subjectType, id: awardInput.subjectId }
                  : undefined,
            },
            tx,
          );
          event = recorded.event;

          if (recorded.replayed) {
            return this.replayFromEventInTx(awardInput, event, tx);
          }
        }

        await tx.userGamificationWallet.upsert({
          where: { userId: awardInput.userId },
          update: {},
          create: { userId: awardInput.userId, xp: 0, points: 0 },
        });

        const locked = await tx.$queryRaw<WalletRow[]>`
          SELECT "userId", "xp", "points", "updatedAt"
          FROM "user_gamification_wallets"
          WHERE "userId" = ${awardInput.userId}
          FOR UPDATE
        `;
        const wallet = locked[0];
        if (!wallet) {
          throw new ConflictException(
            `Wallet row missing for user ${awardInput.userId} after upsert`,
          );
        }

        const nextXp =
          awardInput.currency === WalletCurrency.XP
            ? wallet.xp + awardInput.amount
            : wallet.xp;
        const nextPoints =
          awardInput.currency === WalletCurrency.POINTS
            ? wallet.points + awardInput.amount
            : wallet.points;

        if (nextXp < 0 || nextPoints < 0) {
          throw new BadRequestException('Wallet balance cannot go negative');
        }

        const balanceAfter =
          awardInput.currency === WalletCurrency.XP ? nextXp : nextPoints;

        const entry = await tx.walletEntry.create({
          data: {
            userId: awardInput.userId,
            currency: awardInput.currency,
            amount: awardInput.amount,
            balanceAfter,
            reason: awardInput.reason,
            rewardId: awardInput.rewardId ?? null,
            sourceType: awardInput.sourceType ?? null,
            sourceId: awardInput.sourceId ?? null,
            eventId: event?.id ?? null,
          },
        });

        const updatedWallet = await tx.userGamificationWallet.update({
          where: { userId: awardInput.userId },
          data: {
            xp: nextXp,
            points: nextPoints,
          },
        });

        return { wallet: updatedWallet, entry, event, replayed: false };
      });
    } catch (error) {
      if (
        awardInput.idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const replayed = await this.tryReplayAward(awardInput);
        if (replayed) {
          return replayed;
        }
      }
      throw error;
    }
  }

  private resolveIdempotencyKey(input: AwardWalletInput): string | null {
    if (input.idempotencyKey) {
      return input.idempotencyKey;
    }

    if (!input.rewardId || !input.sourceType || !input.sourceId) {
      return null;
    }

    return [
      'wallet-award',
      input.userId,
      input.sourceType,
      input.sourceId,
      input.rewardId,
      input.currency,
    ].join(':');
  }

  private async tryReplayAward(
    input: AwardWalletInput,
  ): Promise<AwardWalletResult | null> {
    if (!input.idempotencyKey) {
      return null;
    }

    const existingEvent = await this.userEventService.findByIdempotencyKey(
      input.idempotencyKey,
      undefined,
      { walletEntries: true },
    );
    if (
      !existingEvent ||
      !('walletEntries' in existingEvent) ||
      !Array.isArray(existingEvent.walletEntries)
    ) {
      return null;
    }

    const wallet = await this.ensureWallet(input.userId);
    return this.buildReplayResult(input, existingEvent, wallet);
  }

  private async replayFromEventInTx(
    input: AwardWalletInput,
    event: UserEvent,
    tx: Prisma.TransactionClient,
  ): Promise<AwardWalletResult> {
    const eventWithEntries = await tx.userEvent.findUnique({
      where: { id: event.id },
      include: { walletEntries: true },
    });
    if (!eventWithEntries) {
      throw new ConflictException(
        `Idempotent event ${input.idempotencyKey} is missing`,
      );
    }

    const wallet = await tx.userGamificationWallet.findUnique({
      where: { userId: input.userId },
    });
    if (!wallet) {
      throw new ConflictException(
        `Wallet row missing for user ${input.userId} during idempotent replay`,
      );
    }

    return this.buildReplayResult(input, eventWithEntries, wallet);
  }

  private buildReplayResult(
    input: AwardWalletInput,
    event: UserEvent & { walletEntries: WalletEntry[] },
    wallet: UserGamificationWallet,
  ): AwardWalletResult {
    const entry = event.walletEntries.find(
      (e) => e.currency === input.currency && e.amount === input.amount,
    );
    if (!entry) {
      throw new ConflictException(
        `Idempotent event ${input.idempotencyKey} exists without matching wallet entry`,
      );
    }
    return {
      wallet,
      entry,
      event,
      replayed: true,
    };
  }
}
