import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FoodyItem,
  FoodyItemType,
  Prisma,
  WalletCurrency,
} from '@prisma/client';
import {
  EventSource,
  EventSubjectType,
  EventType,
} from '../../events/event-types';
import { PrismaService } from '../../database/prisma.service';
import { UserEventService } from '../../events/services/user-event.service';
import { GamificationProfileService } from '../../gamification/services/gamification-profile.service';
import { GamificationWalletService } from '../../gamification/services/gamification-wallet.service';
import { CreateFoodyItemDto } from '../dto/create-foody-item.dto';
import { QueryFoodyItemsDto } from '../dto/query-foody-items.dto';
import {
  FoodyItemResponseDto,
  FoodyLoadoutResponseDto,
  FoodyPurchaseResponseDto,
} from '../dto/response-foody-item.dto';
import { UpdateFoodyItemDto } from '../dto/update-foody-item.dto';
import {
  FoodyItemWithOwnership,
  FoodyRepository,
} from '../repositories/foody.repository';

@Injectable()
export class FoodyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly foodyRepository: FoodyRepository,
    private readonly walletService: GamificationWalletService,
    private readonly profileService: GamificationProfileService,
    private readonly userEventService: UserEventService,
  ) {}

  async listForUser(
    userId: string,
    query: QueryFoodyItemsDto,
    options: { isAdmin: boolean },
  ): Promise<FoodyItemResponseDto[]> {
    // Non-admins never see unpublished catalog rows, whatever they ask for.
    const available = options.isAdmin ? query.available : true;

    const items = await this.foodyRepository.findAllForUser(userId, {
      type: query.type,
      available,
      ownedOnly: query.ownedOnly,
    });

    return items.map((item) => this.toDto(item));
  }

  async getLoadout(userId: string): Promise<FoodyLoadoutResponseDto> {
    const equipped = await this.foodyRepository.findEquippedForUser(userId);
    const byType = new Map(equipped.map((item) => [item.type, item]));

    const pick = (type: FoodyItemType) => {
      const item = byType.get(type);
      return item ? this.toDto(item) : null;
    };

    return {
      antennas: pick(FoodyItemType.ANTENNAS),
      ears: pick(FoodyItemType.EARS),
      glasses: pick(FoodyItemType.GLASSES),
    };
  }

  /**
   * Buys an item for the user, charging `cost` points (0 = free to claim).
   */
  async purchase(
    userId: string,
    codeOrId: string,
  ): Promise<FoodyPurchaseResponseDto> {
    const item = await this.requireItem(codeOrId);

    if (!item.available) {
      throw new NotFoundException('Foody item not found');
    }

    const existing = await this.foodyRepository.findOwnership(userId, item.id);
    if (existing) {
      throw new ConflictException('Foody item already owned');
    }

    const price = item.cost;

    const purchaseIdempotencyKey = `foody-purchase:${userId}:${item.id}`;

    // A free claim moves no points, so `award()` (which rejects a zero amount)
    // has nothing to do and the ledger only records the event.
    const chargedBalance = await this.prisma.$transaction(async (tx) => {
      await this.grant(userId, item, price, tx);

      if (price === 0) {
        await this.recordEvent(
          userId,
          item,
          EventType.FOODY_ITEM_PURCHASED,
          tx,
          purchaseIdempotencyKey,
        );
        return null;
      }

      const { wallet } = await this.walletService.award(
        {
          userId,
          currency: WalletCurrency.POINTS,
          amount: -price,
          reason: `Foody item ${item.code} purchased`,
          eventType: EventType.FOODY_ITEM_PURCHASED,
          source: EventSource.FOODY,
          subjectType: EventSubjectType.FOODY_ITEM,
          subjectId: item.id,
          metadata: {
            itemId: item.id,
            itemCode: item.code,
            type: item.type,
            cost: price,
          },
          idempotencyKey: purchaseIdempotencyKey,
        },
        tx,
      );

      return wallet.points;
    });

    // Reading an unchanged balance outside the transaction is safe.
    const pointsBalance =
      chargedBalance ??
      (await this.profileService.getWalletBalance(userId)).points;

    return {
      item: this.toDto({ ...item, ownedBy: [{ equipped: false }] }),
      pricePaid: price,
      pointsBalance,
    };
  }

  /** Wears an owned item, replacing whatever the user wore in that category. */
  async equip(userId: string, codeOrId: string): Promise<FoodyItemResponseDto> {
    const item = await this.requireItem(codeOrId);
    await this.requireOwnership(userId, item);

    await this.prisma.$transaction(async (tx) => {
      await this.foodyRepository.lockLoadout(userId, tx);

      const changed = await this.foodyRepository.equipExclusively(
        userId,
        item,
        tx,
      );
      if (changed) {
        await this.recordEvent(userId, item, EventType.FOODY_ITEM_EQUIPPED, tx);
      }
    });

    return this.toDto({ ...item, ownedBy: [{ equipped: true }] });
  }

  async unequip(
    userId: string,
    codeOrId: string,
  ): Promise<FoodyItemResponseDto> {
    const item = await this.requireItem(codeOrId);
    await this.requireOwnership(userId, item);

    await this.prisma.$transaction(async (tx) => {
      await this.foodyRepository.lockLoadout(userId, tx);

      const changed = await this.foodyRepository.unequip(userId, item.id, tx);
      if (changed) {
        await this.recordEvent(
          userId,
          item,
          EventType.FOODY_ITEM_UNEQUIPPED,
          tx,
        );
      }
    });

    return this.toDto({ ...item, ownedBy: [{ equipped: false }] });
  }

  // ----- admin catalog management -----

  async create(dto: CreateFoodyItemDto): Promise<FoodyItemResponseDto> {
    const item = await this.foodyRepository.create({
      code: dto.code,
      type: dto.type,
      slot: dto.slot,
      cost: dto.cost ?? 0,
      available: dto.available ?? true,
    });
    return this.toDto({ ...item, ownedBy: [] });
  }

  async update(
    id: string,
    dto: UpdateFoodyItemDto,
  ): Promise<FoodyItemResponseDto> {
    const existing = await this.requireItem(id);

    if (
      dto.type !== undefined &&
      dto.type !== existing.type &&
      (await this.foodyRepository.hasOwnerships(existing.id))
    ) {
      throw new ConflictException(
        'Cannot change Foody item type after ownership exists',
      );
    }

    const item = await this.foodyRepository.update(id, {
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.slot !== undefined ? { slot: dto.slot } : {}),
      ...(dto.cost !== undefined ? { cost: dto.cost } : {}),
      ...(dto.available !== undefined ? { available: dto.available } : {}),
    });
    return this.toDto({ ...item, ownedBy: [] });
  }

  async remove(id: string): Promise<void> {
    await this.foodyRepository.remove(id);
  }

  // ----- helpers -----

  private async requireItem(codeOrId: string): Promise<FoodyItem> {
    const item = await this.foodyRepository.findByCodeOrId(codeOrId);
    if (!item) {
      throw new NotFoundException('Foody item not found');
    }
    return item;
  }

  private async requireOwnership(
    userId: string,
    item: FoodyItem,
  ): Promise<void> {
    const ownership = await this.foodyRepository.findOwnership(userId, item.id);
    if (!ownership) {
      throw new ConflictException('Foody item not owned');
    }
  }

  private async grant(
    userId: string,
    item: FoodyItem,
    pricePaid: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    try {
      await this.foodyRepository.grant(userId, item.id, pricePaid, tx);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Won by a parallel request for the same item.
        throw new ConflictException('Foody item already owned');
      }
      throw error;
    }
  }

  /**
   * Records a Foody event on the caller's transaction, so it lands with the
   * ownership change or not at all.
   */
  private async recordEvent(
    userId: string,
    item: FoodyItem,
    eventType: (typeof EventType)[keyof typeof EventType],
    tx: Prisma.TransactionClient,
    idempotencyKey?: string,
  ): Promise<void> {
    await this.userEventService.record(
      {
        userId,
        eventType,
        source: EventSource.FOODY,
        metadata: {
          itemId: item.id,
          itemCode: item.code,
          type: item.type,
        },
        subject: { type: EventSubjectType.FOODY_ITEM, id: item.id },
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
      tx,
    );
  }

  private toDto(item: FoodyItemWithOwnership): FoodyItemResponseDto {
    const ownership = item.ownedBy[0];
    const owned = ownership !== undefined;

    return {
      id: item.id,
      code: item.code,
      type: item.type,
      slot: item.slot,
      cost: item.cost,
      // Locked is purely "not yours yet" — buying it unlocks it.
      locked: !owned,
      owned,
      equipped: ownership?.equipped ?? false,
      available: item.available,
    };
  }
}
