import { Injectable } from '@nestjs/common';
import { FoodyItem, FoodyItemType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { codeOrIdWhere } from '../../learning/utils/code-or-id';

/** A catalog row plus the current user's ownership row (absent when not owned). */
export type FoodyItemWithOwnership = FoodyItem & {
  ownedBy: { equipped: boolean }[];
};

@Injectable()
export class FoodyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Catalog rows with the caller's ownership joined in. `ownedBy` is filtered to
   * the one user, so it holds at most one row.
   */
  async findAllForUser(
    userId: string,
    filters: {
      type?: FoodyItemType;
      available?: boolean;
      ownedOnly?: boolean;
    } = {},
  ): Promise<FoodyItemWithOwnership[]> {
    const where: Prisma.FoodyItemWhereInput = {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.available !== undefined
        ? { available: filters.available }
        : {}),
      ...(filters.ownedOnly ? { ownedBy: { some: { userId } } } : {}),
    };

    return this.prisma.foodyItem.findMany({
      where,
      include: {
        ownedBy: { where: { userId }, select: { equipped: true } },
      },
      orderBy: [{ type: 'asc' }, { slot: 'asc' }],
    });
  }

  async findEquippedForUser(userId: string): Promise<FoodyItemWithOwnership[]> {
    return this.prisma.foodyItem.findMany({
      where: { ownedBy: { some: { userId, equipped: true } } },
      include: {
        ownedBy: { where: { userId }, select: { equipped: true } },
      },
      orderBy: [{ type: 'asc' }, { slot: 'asc' }],
    });
  }

  async findByCodeOrId(codeOrId: string): Promise<FoodyItem | null> {
    return this.prisma.foodyItem.findFirst({ where: codeOrIdWhere(codeOrId) });
  }

  async findOwnership(
    userId: string,
    foodyItemId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    return db.userFoodyItem.findUnique({
      where: { userId_foodyItemId: { userId, foodyItemId } },
    });
  }

  /** Grants an item to a user. `pricePaid` records what the wallet was charged. */
  async grant(
    userId: string,
    foodyItemId: string,
    pricePaid: number,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    return db.userFoodyItem.create({
      data: { userId, foodyItemId, pricePaid },
    });
  }

  async hasOwnerships(
    foodyItemId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const db = tx ?? this.prisma;
    const count = await db.userFoodyItem.count({ where: { foodyItemId } });
    return count > 0;
  }

  /**
   * Holds the user's loadout rows for the rest of `tx`, so two concurrent equips
   * cannot each believe the other slot is free. Locks the ownership rows rather
   * than the `users` row, which is hot with unrelated profile writes.
   */
  async lockLoadout(
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.$queryRaw`
      SELECT "userId"
      FROM "user_foody_items"
      WHERE "userId" = ${userId}
      FOR UPDATE
    `;
  }

  /**
   * Equips one owned item and unequips the user's other items of the same type,
   * so a user never wears two items of one category. Returns whether anything
   * actually moved. Caller must hold the loadout lock on `tx`.
   */
  async equipExclusively(
    userId: string,
    item: Pick<FoodyItem, 'id' | 'type'>,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const cleared = await tx.userFoodyItem.updateMany({
      where: {
        userId,
        equipped: true,
        foodyItemId: { not: item.id },
        item: { type: item.type },
      },
      data: { equipped: false },
    });

    const equipped = await tx.userFoodyItem.updateMany({
      where: { userId, foodyItemId: item.id, equipped: false },
      data: { equipped: true },
    });

    return cleared.count > 0 || equipped.count > 0;
  }

  /** Returns whether the item was equipped before this call. */
  async unequip(
    userId: string,
    foodyItemId: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const result = await tx.userFoodyItem.updateMany({
      where: { userId, foodyItemId, equipped: true },
      data: { equipped: false },
    });

    return result.count > 0;
  }

  async create(data: Prisma.FoodyItemCreateInput): Promise<FoodyItem> {
    return this.prisma.foodyItem.create({ data });
  }

  async update(
    id: string,
    data: Prisma.FoodyItemUpdateInput,
  ): Promise<FoodyItem> {
    return this.prisma.foodyItem.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.foodyItem.delete({ where: { id } });
  }
}
