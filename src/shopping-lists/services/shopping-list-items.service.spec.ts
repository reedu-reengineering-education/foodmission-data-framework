import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ShoppingListItemService } from './shopping-list-items.service';
import { ShoppingListItemRepository } from '../repositories/shopping-list-items.repository';
import { FoodProductRepository } from '../../food-products/repositories/food-product.repository';
import { GenericFoodRepository } from '../../generic-foods/repositories/generic-food.repository';
import { QueryShoppingListItemDto } from '../dto/query-shopping-list-item.dto';
import { UpdateShoppingListItemDto } from '../dto/update-shopping-list-item.dto';
import { ShoppingListRepository } from '../repositories/shopping-lists.repository';
import { TEST_FOOD } from '../../../test/fixtures/food.fixtures';

describe('ShoppingListItemService', () => {
  let service: ShoppingListItemService;
  let repository: jest.Mocked<ShoppingListItemRepository>;
  let shoppingListRepository: jest.Mocked<ShoppingListRepository>;
  let foodProductRepository: jest.Mocked<FoodProductRepository>;

  const mockShoppingList: any = {
    id: 'list-1',
    title: 'Test List',
    userId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockItem: any = {
    id: 'item-1',
    shoppingListId: 'list-1',
    checked: false,
    quantity: 1,
    unit: 'KG',
    itemType: 'food_product',
    foodProductId: 'food-1',
    genericFoodId: null,
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    shoppingList: { id: 'list-1', userId: 'user-1', title: 'Test List' },
    foodProduct: { ...TEST_FOOD },
    genericFood: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShoppingListItemService,
        {
          provide: ShoppingListItemRepository,
          useValue: {
            prisma: {
              $transaction: jest.fn().mockImplementation((cb) => cb({})),
            },
            findById: jest.fn(),
            findMany: jest.fn(),
            findByShoppingListId: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            clearCheckedItems: jest.fn(),
          },
        },
        { provide: FoodProductRepository, useValue: { findById: jest.fn() } },
        { provide: GenericFoodRepository, useValue: { findById: jest.fn() } },
        { provide: ShoppingListRepository, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    service = module.get(ShoppingListItemService);
    repository = module.get(ShoppingListItemRepository);
    shoppingListRepository = module.get(ShoppingListRepository);
    foodProductRepository = module.get(FoodProductRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return items matching filters', async () => {
      const query: QueryShoppingListItemDto = {
        shoppingListId: 'list-1',
        checked: false,
      };
      repository.findMany.mockResolvedValue([mockItem]);

      const result = await service.findAll(query);

      expect(repository.findMany).toHaveBeenCalledWith({
        shoppingListId: 'list-1',
        foodProductId: undefined,
        checked: false,
        unit: undefined,
      });
      expect(result.data).toHaveLength(1);
    });

    it('should pass unit filter through', async () => {
      repository.findMany.mockResolvedValue([mockItem]);

      await service.findAll({ unit: 'KG' });

      expect(repository.findMany).toHaveBeenCalledWith({
        shoppingListId: undefined,
        foodProductId: undefined,
        checked: undefined,
        unit: 'KG',
      });
    });

    it('should return empty array when no items found', async () => {
      repository.findMany.mockResolvedValue([]);

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
    });

    it('should map multiple items to response DTOs', async () => {
      const items = [
        mockItem,
        { ...mockItem, id: '2', quantity: 3, unit: 'PIECES' as const },
      ];
      repository.findMany.mockResolvedValue(items);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('item-1');
      expect(result.data[1].id).toBe('2');
      expect(result.data[1].unit).toBe('PIECES');
    });
  });

  describe('findByShoppingList', () => {
    beforeEach(() => {
      shoppingListRepository.findById.mockResolvedValue(mockShoppingList);
    });

    it('should return items for a shopping list', async () => {
      repository.findByShoppingListId.mockResolvedValue([mockItem]);

      const result = await service.findByShoppingList('list-1', 'user-1');

      expect(repository.findByShoppingListId).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id');
    });

    it('should ignore empty string filters', async () => {
      repository.findByShoppingListId.mockResolvedValue([mockItem]);

      const result = await service.findByShoppingList('list-1', 'user-1', {
        foodProductId: '',
        checked: '' as any,
        unit: '' as any,
      });

      expect(result.data).toHaveLength(1);
    });

    it('should map multiple items to response DTOs', async () => {
      const items = [mockItem, { ...mockItem, id: '2', quantity: 5 }];
      repository.findByShoppingListId.mockResolvedValue(items);

      const result = await service.findByShoppingList('list-1', 'user-1');

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('item-1');
      expect(result.data[1].id).toBe('2');
      expect(result.data[1].quantity).toBe(5);
    });

    it('should throw NotFoundException when shopping list not found', async () => {
      shoppingListRepository.findById.mockResolvedValue(null);

      await expect(
        service.findByShoppingList('list-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return the item', async () => {
      repository.findById.mockResolvedValue(mockItem);

      const result = await service.findById('item-1', 'user-1');

      expect(result).toHaveProperty('id');
    });

    it('should throw NotFoundException when item not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('item-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own the item', async () => {
      repository.findById.mockResolvedValue({
        ...mockItem,
        shoppingList: { ...mockItem.shoppingList, userId: 'other-user' },
      });

      await expect(service.findById('item-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      repository.findById.mockResolvedValue(mockItem);
    });

    it('should update fields and return the updated item', async () => {
      repository.update.mockResolvedValue({
        ...mockItem,
        quantity: 5,
        checked: true,
      });

      const result = await service.update(
        'item-1',
        { quantity: 5, checked: true },
        'user-1',
      );

      expect(repository.update).toHaveBeenCalled();
      expect(result.quantity).toBe(5);
      expect(result.checked).toBe(true);
    });

    it('should validate food product existence when foodProductId changes', async () => {
      foodProductRepository.findById.mockResolvedValue({ ...TEST_FOOD } as any);
      repository.update.mockResolvedValue({
        ...mockItem,
        foodProductId: 'new-food-1',
      });

      await service.update(
        'item-1',
        { foodProductId: 'new-food-1' } as UpdateShoppingListItemDto,
        'user-1',
      );

      expect(foodProductRepository.findById).toHaveBeenCalledWith('new-food-1');
    });

    it('should not query food product when foodProductId is not in dto', async () => {
      repository.update.mockResolvedValue(mockItem);

      await service.update('item-1', { quantity: 5 }, 'user-1');

      expect(foodProductRepository.findById).not.toHaveBeenCalled();
    });

    it('should validate shopping list ownership when shoppingListId changes', async () => {
      shoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      repository.update.mockResolvedValue({
        ...mockItem,
        shoppingListId: 'new-list-1',
      });

      await service.update(
        'item-1',
        { shoppingListId: 'new-list-1' },
        'user-1',
      );

      expect(shoppingListRepository.findById).toHaveBeenCalled();
    });

    it('should not query shopping list when shoppingListId is not in dto', async () => {
      repository.update.mockResolvedValue(mockItem);

      await service.update('item-1', { quantity: 5 }, 'user-1');

      expect(shoppingListRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when item not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update('item-1', {}, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint violation',
        { code: 'P2002', clientVersion: '5.0.0' },
      );
      repository.update.mockRejectedValue(prismaError);

      await expect(
        service.update('item-1', { quantity: 5 }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException on unknown error', async () => {
      repository.update.mockRejectedValue(new Error('Unknown error'));

      await expect(
        service.update('item-1', { quantity: 5 }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete the item', async () => {
      repository.findById.mockResolvedValue(mockItem);
      repository.delete.mockResolvedValue(undefined);

      await service.remove('item-1', 'user-1');

      expect(repository.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when item not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('item-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not own the item', async () => {
      repository.findById.mockResolvedValue({
        ...mockItem,
        shoppingList: { ...mockItem.shoppingList, userId: 'other-user' },
      });

      await expect(service.remove('item-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('clearCheckedItems', () => {
    it('should clear checked items', async () => {
      shoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      repository.clearCheckedItems.mockResolvedValue(undefined as any);

      await service.clearCheckedItems('list-1', 'user-1');

      expect(repository.clearCheckedItems).toHaveBeenCalledWith(
        'list-1',
        'user-1',
        expect.anything(),
      );
    });

    it('should throw NotFoundException when shopping list not found', async () => {
      shoppingListRepository.findById.mockResolvedValue(null);

      await expect(
        service.clearCheckedItems('list-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(repository.clearCheckedItems).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not own the list', async () => {
      shoppingListRepository.findById.mockResolvedValue({
        ...mockShoppingList,
        userId: 'other-user',
      });

      await expect(
        service.clearCheckedItems('list-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.clearCheckedItems).not.toHaveBeenCalled();
    });
  });
});
