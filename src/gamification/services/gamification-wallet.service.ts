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
  EventSourceValue,
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
  source?: EventSourceValue;
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

  private async ensureWallet(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserGamificationWallet> {
    const db = tx ?? this.prisma;
    return db.userGamificationWallet.upsert({
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
  async award(
    input: AwardWalletInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AwardWalletResult> {
    if (input.amount === 0) {
      throw new BadRequestException('Wallet award amount must be non-zero');
    }

    const awardInput = {
      ...input,
      idempotencyKey: this.resolveIdempotencyKey(input),
    };

    if (awardInput.idempotencyKey) {
      const replayed = await this.tryReplayAward(awardInput, tx);
      if (replayed) {
        return replayed;
      }
    }

    try {
      if (tx) {
        return await this.executeAward(awardInput, tx);
      }

      return await this.prisma.$transaction((innerTx) =>
        this.executeAward(awardInput, innerTx),
      );
    } catch (error) {
      // Only retry the replay when we own the transaction. A P2002 raised inside
      // a caller's transaction has already aborted it, so any further query on
      // that client fails with 25P02 — and the caller rolls back regardless.
      if (
        !tx &&
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
    tx?: Prisma.TransactionClient,
  ): Promise<AwardWalletResult | null> {
    if (!input.idempotencyKey) {
      return null;
    }

    const existingEvent = await this.userEventService.findByIdempotencyKey(
      input.idempotencyKey,
      tx,
      { walletEntries: true },
    );
    if (
      !existingEvent ||
      !('walletEntries' in existingEvent) ||
      !Array.isArray(existingEvent.walletEntries)
    ) {
      return null;
    }

    const wallet = await this.ensureWallet(input.userId, tx);
    return this.buildReplayResult(input, existingEvent, wallet);
  }

  private async executeAward(
    awardInput: AwardWalletInput,
    tx: Prisma.TransactionClient,
  ): Promise<AwardWalletResult> {
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
          source: awardInput.source ?? EventSource.WALLET,
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

    const isXp = awardInput.currency === WalletCurrency.XP;
    const amount = awardInput.amount;

    // The UPDATE takes the row lock itself, and under READ COMMITTED Postgres
    // re-evaluates the balance guard against the row version it waited for — so
    // a concurrent debit can never drive the balance negative.
    const debited = await tx.userGamificationWallet.updateMany({
      where: {
        userId: awardInput.userId,
        ...(amount < 0
          ? isXp
            ? { xp: { gte: -amount } }
            : { points: { gte: -amount } }
          : {}),
      },
      data: isXp
        ? { xp: { increment: amount } }
        : { points: { increment: amount } },
    });

    if (debited.count === 0) {
      if (amount < 0) {
        throw new BadRequestException('Wallet balance cannot go negative');
      }
      // A credit has no guard in its predicate, so a miss means the row vanished.
      throw new ConflictException(
        `Wallet row missing for user ${awardInput.userId} after upsert`,
      );
    }

    const updatedWallet = await tx.userGamificationWallet.findUniqueOrThrow({
      where: { userId: awardInput.userId },
    });

    const balanceAfter = isXp ? updatedWallet.xp : updatedWallet.points;

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

    return { wallet: updatedWallet, entry, event, replayed: false };
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
    // Match on currency only. The idempotency key identifies the award
    // (user + source + reward + currency), not the amount, so a reward whose
    // configured xp/points changed after the first credit still replays instead
    // of throwing. The stored entry is authoritative for what was actually paid.
    const entry = event.walletEntries.find(
      (e) => e.currency === input.currency,
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
