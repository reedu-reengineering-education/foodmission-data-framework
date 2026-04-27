import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShoppingListItemService } from './shopping-list-items.service';
import { ShoppingListItemRepository } from '../repositories/shopping-list-items.repository';
import { FoodProductRepository } from '../../food-products/repositories/food-product.repository';
import { GenericFoodRepository } from '../../generic-foods/repositories/generic-food.repository';
import { ShoppingListRepository } from '../repositories/shopping-lists.repository';

describe('ShoppingListItemService', () => {
  let service: ShoppingListItemService;
  let repository: jest.Mocked<ShoppingListItemRepository>;
  let shoppingListRepository: jest.Mocked<ShoppingListRepository>;

  const mockItem: any = {
    id: 'item-1',
    shoppingListId: 'list-1',
    checked: false,
    quantity: 1,
    unit: 'KG',
    shoppingList: { id: 'list-1', userId: 'user-1' },
  };

  beforeEach(async () => {
    const mockRepository = {
      prisma: {
        $transaction: jest.fn().mockImplementation((cb) => cb({})),
      },
      findById: jest.fn(),
      update: jest.fn(),
      clearCheckedItems: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShoppingListItemService,
        { provide: ShoppingListItemRepository, useValue: mockRepository },
        { provide: FoodProductRepository, useValue: { findById: jest.fn() } },
        { provide: GenericFoodRepository, useValue: { findById: jest.fn() } },
        { provide: ShoppingListRepository, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    service = module.get(ShoppingListItemService);
    repository = module.get(ShoppingListItemRepository);
    shoppingListRepository = module.get(ShoppingListRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates checked via regular update', async () => {
    repository.findById.mockResolvedValue(mockItem);
    repository.update.mockResolvedValue({ ...mockItem, checked: true });

    const result = await service.update('item-1', { checked: true }, 'user-1');

    expect(repository.update).toHaveBeenCalledWith('item-1', { checked: true });
    expect(result.checked).toBe(true);
  });

  it('clearCheckedItems validates list ownership and clears items', async () => {
    shoppingListRepository.findById.mockResolvedValue({
      id: 'list-1',
      userId: 'user-1',
    } as any);
    repository.clearCheckedItems.mockResolvedValue(undefined as any);

    await service.clearCheckedItems('list-1', 'user-1');

    expect(repository.clearCheckedItems).toHaveBeenCalled();
  });

  it('clearCheckedItems throws when list does not belong to user', async () => {
    shoppingListRepository.findById.mockResolvedValue({
      id: 'list-1',
      userId: 'other-user',
    } as any);

    await expect(service.clearCheckedItems('list-1', 'user-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('update throws when item not found', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.update('item-1', { checked: true }, 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
