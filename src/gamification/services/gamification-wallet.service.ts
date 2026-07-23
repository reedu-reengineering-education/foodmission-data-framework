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
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EventSource } from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';

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

    if (input.idempotencyKey) {
      const replayed = await this.tryReplayAward(input);
      if (replayed) {
        return replayed;
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        let event: UserEvent | null = null;

        if (input.eventId) {
          event = await tx.userEvent.findUniqueOrThrow({
            where: { id: input.eventId },
          });
        } else if (input.eventType || input.idempotencyKey) {
          const recorded = await this.userEventService.record(
            {
              userId: input.userId,
              groupId: input.groupId,
              eventType: input.eventType ?? 'POINTS_AWARDED',
              source: EventSource.WALLET,
              metadata: input.metadata ?? {
                currency: input.currency,
                amount: input.amount,
                reason: input.reason,
              },
              idempotencyKey: input.idempotencyKey,
              subject:
                input.subjectType != null
                  ? { type: input.subjectType, id: input.subjectId }
                  : undefined,
            },
            tx,
          );
          event = recorded.event;

          if (recorded.replayed) {
            return this.replayFromEventInTx(input, event, tx);
          }
        }

        await tx.userGamificationWallet.upsert({
          where: { userId: input.userId },
          update: {},
          create: { userId: input.userId, xp: 0, points: 0 },
        });

        const locked = await tx.$queryRaw<WalletRow[]>`
          SELECT "userId", "xp", "points", "updatedAt"
          FROM "user_gamification_wallets"
          WHERE "userId" = ${input.userId}
          FOR UPDATE
        `;
        const wallet = locked[0];
        if (!wallet) {
          throw new ConflictException(
            `Wallet row missing for user ${input.userId} after upsert`,
          );
        }

        const nextXp =
          input.currency === WalletCurrency.XP
            ? wallet.xp + input.amount
            : wallet.xp;
        const nextPoints =
          input.currency === WalletCurrency.POINTS
            ? wallet.points + input.amount
            : wallet.points;

        if (nextXp < 0 || nextPoints < 0) {
          throw new BadRequestException('Wallet balance cannot go negative');
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
          },
        });

        return { wallet: updatedWallet, entry, event, replayed: false };
      });
    } catch (error) {
      if (
        input.idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const replayed = await this.tryReplayAward(input);
        if (replayed) {
          return replayed;
        }
      }
      throw error;
    }
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
