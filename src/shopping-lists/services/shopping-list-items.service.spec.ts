import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShoppingListItemService } from './shopping-list-items.service';
import { ShoppingListItemRepository } from '../repositories/shopping-list-items.repository';
import { FoodProductRepository } from '../../food-products/repositories/food-product.repository';
import { GenericFoodRepository } from '../../generic-foods/repositories/generic-food.repository';
import { CreateShoppingListItemDto } from '../dto/create-shopping-list-item.dto';
import { UpdateShoppingListItemDto } from '../dto/update-shopping-list-item.dto';
import { QueryShoppingListItemDto } from '../dto/query-shopping-list-item.dto';
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
    itemType: 'food' as const,
    foodId: 'food-1',
    foodCategoryId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    shoppingList: {
      id: 'list-1',
      title: 'Test List',
      userId: 'user-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    food: {
      id: 'food-1',
      name: 'Test Food',
      description: null,
      barcode: null,
      createdBy: 'user-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      // Product metadata
      brands: null,
      categories: [],
      labels: [],
      quantity: null,
      servingSize: null,
      ingredientsText: null,
      allergens: [],
      traces: [],
      countries: [],
      origins: null,
      manufacturingPlaces: null,
      imageUrl: null,
      imageFrontUrl: null,
      // Nutriments
      nutritionDataPer: null,
      energyKcal: null,
      energyKj: null,
      fat: null,
      saturatedFat: null,
      transFat: null,
      cholesterol: null,
      carbohydrates: null,
      sugars: null,
      addedSugars: null,
      fiber: null,
      proteins: null,
      salt: null,
      sodium: null,
      vitaminA: null,
      vitaminC: null,
      calcium: null,
      iron: null,
      potassium: null,
      magnesium: null,
      zinc: null,
      nutrimentsRaw: null,
      // Scores
      nutriscoreGrade: null,
      nutriscoreScore: null,
      novaGroup: null,
      ecoscoreGrade: null,
      carbonFootprint: null,
      nutrientLevels: null,
      // Diet analysis
      isVegan: null,
      isVegetarian: null,
      isPalmOilFree: null,
      ingredientsAnalysisTags: [],
      // Packaging
      packagingTags: [],
      packagingMaterials: [],
      packagingRecycling: [],
      packagingText: null,
      // Data quality
      completeness: null,
    },
    foodCategory: null,
  } as any; // Type assertion for test mock with polymorphic fields

  const mockShoppingList = {
    id: 'list-1',
    title: 'Test List',
    userId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockFood = { ...TEST_FOOD };

  const mockFoodRepository = {
    findById: jest.fn(),
  };

  const mockFoodCategoriesRepository = {
    findById: jest.fn(),
  };

  const mockShoppingListRepository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const mockRepository = {
      prisma: {
        $transaction: jest.fn().mockImplementation((cb) => cb({})),
      },
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
  describe('findAll', () => {
    it('should return all shopping list items with filters', async () => {
      const query: QueryShoppingListItemDto = {
        shoppingListId: 'list-1',
        checked: false,
      };

      repository.findMany.mockResolvedValue([mockShoppingListItem]);

      const result = await service.findAll(query);

      expect(repository.findMany).toHaveBeenCalledWith({
        shoppingListId: 'list-1',
        foodId: undefined,
        checked: false,
        unit: undefined,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('quantity');
      expect(result.data[0]).toHaveProperty('unit');
    });

    it('should handle unit filter with case-insensitive search', async () => {
      const query: QueryShoppingListItemDto = {
        unit: 'KG',
      };
      repository.findMany.mockResolvedValue([mockShoppingListItem]);

      const result = await service.findAll(query);

      expect(repository.findMany).toHaveBeenCalledWith({
        shoppingListId: undefined,
        foodId: undefined,
        checked: undefined,
        unit: 'KG',
      });
      expect(result.data).toHaveLength(1);
    });

    it('should transform multiple items correctly using transformMultipleToResponseDto', async () => {
      const multipleItems = [
        mockShoppingListItem,
        {
          ...mockShoppingListItem,
          id: '2',
          quantity: 3,
          unit: 'PIECES' as const,
        },
      ];
      repository.findMany.mockResolvedValue(multipleItems);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('1');
      expect(result.data[0].quantity).toBe(2);
      expect(result.data[1].id).toBe('2');
      expect(result.data[1].quantity).toBe(3);
      expect(result.data[1].unit).toBe('PIECES');
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should return empty array when no items found', async () => {
      repository.findMany.mockResolvedValue([]);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(0);
      expect(result.data).toEqual([]);
    });

    it('should handle findAll with all filters', async () => {
      const query: QueryShoppingListItemDto = {
        shoppingListId: 'list-1',
        foodId: 'food-1',
        checked: true,
        unit: 'KG',
      };
      repository.findMany.mockResolvedValue([mockShoppingListItem]);

      const result = await service.findAll(query);

      expect(repository.findMany).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('should handle findAll with empty query object', async () => {
      repository.findMany.mockResolvedValue([mockShoppingListItem]);

      const result = await service.findAll({});

      expect(repository.findMany).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findByShoppingList', () => {
    it('should return items for a shopping list', async () => {
      mockShoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      repository.findByShoppingListId.mockResolvedValue([mockShoppingListItem]);

      const result = await service.findByShoppingList('list-1', 'user-1');

      expect(mockShoppingListRepository.findById).toHaveBeenCalled();
      expect(repository.findByShoppingListId).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id');
    });

    it('should ignore empty string filters and return all items', async () => {
      mockShoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      repository.findByShoppingListId.mockResolvedValue([mockShoppingListItem]);

      const result = await service.findByShoppingList('list-1', 'user-1', {
        foodId: '',
        checked: '' as any,
        unit: '' as any,
      });

      expect(repository.findByShoppingListId).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('should throw NotFoundException when shopping list not found', async () => {
      mockShoppingListRepository.findById.mockResolvedValue(null);

      await expect(
        service.findByShoppingList('list-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should transform multiple items correctly using transformMultipleToResponseDto', async () => {
      const multipleItems = [
        mockShoppingListItem,
        {
          ...mockShoppingListItem,
          id: '2',
          quantity: 5,
        },
      ];
      mockShoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      repository.findByShoppingListId.mockResolvedValue(multipleItems);

      const result = await service.findByShoppingList('list-1', 'user-1');

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('1');
      expect(result.data[1].id).toBe('2');
      expect(result.data[1].quantity).toBe(5);
    });
  });

  describe('findById', () => {
    it('should return a shopping list item by id', async () => {
      repository.findById.mockResolvedValue(mockShoppingListItem);

      const result = await service.findById('1', 'user-1');

      expect(repository.findById).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('should throw NotFoundException when item not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not have access', async () => {
      const itemWithDifferentUser = {
        ...mockShoppingListItem,
        shoppingList: {
          ...mockShoppingListItem.shoppingList,
          userId: 'other-user',
        },
      };
      repository.findById.mockResolvedValue(itemWithDifferentUser);

      await expect(service.findById('1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update a shopping list item', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListItemDto = {
        quantity: 5,
        checked: true,
      };

      const updatedItem = {
        ...mockShoppingListItem,
        quantity: 5,
        checked: true,
      };

      repository.findById.mockResolvedValue(mockShoppingListItem);
      repository.update.mockResolvedValue(updatedItem);

      const result = await service.update(itemId, updateDto, userId);

      expect(repository.findById).toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalled();
      expect(result.quantity).toBe(5);
      expect(result.checked).toBe(true);
    });

    it('should validate food exists when foodId is updated', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListItemDto = {
        foodId: 'new-food-1',
      };

      repository.findById.mockResolvedValue(mockShoppingListItem);
      mockFoodRepository.findById.mockResolvedValue(mockFood);
      repository.update.mockResolvedValue({
        ...mockShoppingListItem,
        foodId: 'new-food-1',
      });

      await service.update(itemId, updateDto, userId);

      expect(mockFoodRepository.findById).toHaveBeenCalled();
    });

    it('should validate shopping list access when shoppingListId is updated', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListItemDto = {
        shoppingListId: 'new-list-1',
      };

      repository.findById.mockResolvedValue(mockShoppingListItem);
      mockShoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      repository.update.mockResolvedValue({
        ...mockShoppingListItem,
        shoppingListId: 'new-list-1',
      });

      await service.update(itemId, updateDto, userId);

      expect(mockShoppingListRepository.findById).toHaveBeenCalled();
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListItemDto = {
        quantity: 5,
      };

      repository.findById.mockResolvedValue(mockShoppingListItem);
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint violation',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        },
      );
      repository.update.mockRejectedValue(prismaError);

      await expect(service.update(itemId, updateDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException on unknown error', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListItemDto = {
        quantity: 5,
      };

      repository.findById.mockResolvedValue(mockShoppingListItem);
      repository.update.mockRejectedValue(new Error('Unknown error'));

      await expect(service.update(itemId, updateDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle update with empty updateDto (all undefined)', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListItemDto = {};

      repository.findById.mockResolvedValue(mockShoppingListItem);
      repository.update.mockResolvedValue(mockShoppingListItem);

      const result = await service.update(itemId, updateDto, userId);

      expect(repository.findById).toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle update with only notes field', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListItemDto = {
        notes: 'Updated notes',
      };

      const updatedItem = {
        ...mockShoppingListItem,
        notes: 'Updated notes',
      };

      repository.findById.mockResolvedValue(mockShoppingListItem);
      repository.update.mockResolvedValue(updatedItem);

      const result = await service.update(itemId, updateDto, userId);

      expect(repository.update).toHaveBeenCalled();
      expect(result.notes).toBe('Updated notes');
    });

    it('should handle update with only checked field', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListItemDto = {
        checked: true,
      };

      const updatedItem = {
        ...mockShoppingListItem,
        checked: true,
      };

      repository.findById.mockResolvedValue(mockShoppingListItem);
      repository.update.mockResolvedValue(updatedItem);

      const result = await service.update(itemId, updateDto, userId);

      expect(repository.update).toHaveBeenCalledWith(itemId, { checked: true });
      expect(result.checked).toBe(true);
    });

    it('should not validate food when foodId is not in updateDto', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListItemDto = {
        quantity: 5,
      };

      repository.findById.mockResolvedValue(mockShoppingListItem);
      repository.update.mockResolvedValue(mockShoppingListItem);

      await service.update(itemId, updateDto, userId);

      expect(mockFoodRepository.findById).not.toHaveBeenCalled();
    });

    it('should not validate shopping list when shoppingListId is not in updateDto', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListItemDto = {
        quantity: 5,
      };

      repository.findById.mockResolvedValue(mockShoppingListItem);
      repository.update.mockResolvedValue(mockShoppingListItem);

      await service.update(itemId, updateDto, userId);

      expect(mockShoppingListRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a shopping list item', async () => {
      repository.findById.mockResolvedValue(mockShoppingListItem);
      repository.delete.mockResolvedValue(undefined);

      await service.remove('item-1', 'user-1');

      expect(repository.findById).toHaveBeenCalled();
      expect(repository.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when item not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('item-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not have access', async () => {
      const itemWithDifferentUser = {
        ...mockShoppingListItem,
        shoppingList: {
          ...mockShoppingListItem.shoppingList,
          userId: 'other-user',
        },
      };
      repository.findById.mockResolvedValue(itemWithDifferentUser);

      await expect(service.remove('item-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );

      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('clearCheckedItems', () => {
    it('should clear checked items from a shopping list', async () => {
      mockShoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      repository.clearCheckedItems.mockResolvedValue(undefined as any);

      await service.clearCheckedItems('list-1', 'user-1');

      expect(mockShoppingListRepository.findById).toHaveBeenCalled();
      expect(repository.clearCheckedItems).toHaveBeenCalled();

      const callArgs = repository.clearCheckedItems.mock.calls[0];
      expect(callArgs[0]).toBe('list-1');
      expect(callArgs[1]).toBe('user-1');
    });

    it('should throw NotFoundException when shopping list not found', async () => {
      mockShoppingListRepository.findById.mockResolvedValue(null);

      await expect(
        service.clearCheckedItems('list-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);

      expect(repository.clearCheckedItems).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not have access', async () => {
      const shoppingListWithDifferentUser = {
        ...mockShoppingList,
        userId: 'other-user',
      };
      mockShoppingListRepository.findById.mockResolvedValue(
        shoppingListWithDifferentUser,
      );

      await expect(
        service.clearCheckedItems('list-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);

      expect(repository.clearCheckedItems).not.toHaveBeenCalled();
    });
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
