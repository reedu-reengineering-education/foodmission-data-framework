import { Test, TestingModule } from '@nestjs/testing';
import { FoodyItemType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { FoodyRepository } from './foody.repository';

describe('FoodyRepository', () => {
  let repository: FoodyRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodyRepository,
        { provide: PrismaService, useValue: { $transaction: jest.fn() } },
      ],
    }).compile();

    repository = module.get(FoodyRepository);
  });

  it('locks the loadout rows, not the users row', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ userId: 'user-1' }]);

    await repository.lockLoadout('user-1', {
      $queryRaw: queryRaw,
    } as unknown as Prisma.TransactionClient);

    expect(queryRaw).toHaveBeenCalled();
    const sql = queryRaw.mock.calls[0][0].join('?');
    expect(sql).toContain('user_foody_items');
    expect(sql).toContain('FOR UPDATE');
    expect(sql).not.toContain('"users"');
  });

  it('clears the other same-type items before equipping the new one', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });

    const changed = await repository.equipExclusively(
      'user-1',
      { id: 'item-1', type: FoodyItemType.GLASSES },
      { userFoodyItem: { updateMany } } as unknown as Prisma.TransactionClient,
    );

    expect(changed).toBe(true);
    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        userId: 'user-1',
        equipped: true,
        foodyItemId: { not: 'item-1' },
        item: { type: FoodyItemType.GLASSES },
      },
      data: { equipped: false },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { userId: 'user-1', foodyItemId: 'item-1', equipped: false },
      data: { equipped: true },
    });
  });

  it('reports no change when the item was already equipped', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });

    const changed = await repository.equipExclusively(
      'user-1',
      { id: 'item-1', type: FoodyItemType.GLASSES },
      { userFoodyItem: { updateMany } } as unknown as Prisma.TransactionClient,
    );

    expect(changed).toBe(false);
  });

  it('unequips only an item that is currently equipped', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });

    const changed = await repository.unequip('user-1', 'item-1', {
      userFoodyItem: { updateMany },
    } as unknown as Prisma.TransactionClient);

    expect(changed).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', foodyItemId: 'item-1', equipped: true },
      data: { equipped: false },
    });
  });
});
