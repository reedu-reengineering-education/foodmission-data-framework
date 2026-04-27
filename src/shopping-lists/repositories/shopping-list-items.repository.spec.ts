import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ShoppingListItemRepository } from './shopping-list-items.repository';

describe('ShoppingListItemRepository', () => {
  let repository: ShoppingListItemRepository;
  const mockPrismaService = {
    shoppingListItem: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    shoppingList: { count: jest.fn() },
    foodProduct: { count: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShoppingListItemRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    repository = module.get(ShoppingListItemRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it('findMany uses foodProductId filter', async () => {
    mockPrismaService.shoppingListItem.findMany.mockResolvedValue([]);
    await repository.findMany({
      shoppingListId: 'list-1',
      foodProductId: 'food-1',
      checked: false,
    });
    expect(mockPrismaService.shoppingListItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          shoppingListId: 'list-1',
          foodProductId: 'food-1',
          checked: false,
        }),
      }),
    );
  });

  it('findByShoppingListAndFoodRef handles food product refs', async () => {
    mockPrismaService.shoppingListItem.findFirst.mockResolvedValue(null);
    await repository.findByShoppingListAndFoodRef('list-1', {
      foodProductId: 'food-1',
    });
    expect(mockPrismaService.shoppingListItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          shoppingListId: 'list-1',
          foodProductId: 'food-1',
          genericFoodId: undefined,
        },
      }),
    );
  });

  it('count uses renamed foodProductId field', async () => {
    mockPrismaService.shoppingListItem.count.mockResolvedValue(1);
    await repository.count({ foodProductId: 'food-1' });
    expect(mockPrismaService.shoppingListItem.count).toHaveBeenCalledWith({
      where: { foodProductId: 'food-1' },
    });
  });

  it('findByShoppingListAndFoodRef throws when no food ref is provided', async () => {
    await expect(
      repository.findByShoppingListAndFoodRef('list-1', {}),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrismaService.shoppingListItem.findFirst).not.toHaveBeenCalled();
  });
});
