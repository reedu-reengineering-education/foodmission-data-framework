import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ShoppingListItemService } from '../services/shoppingListItem.service';
import { PrismaService } from '../../database/prisma.service';
import { ShoppingListItemRepository } from '../repositories/shoppingListItem.repository';
import { CreateShoppingListItemDto } from '../dto/create-shoppingListItem.dto';
import { UpdateShoppingListItemDto } from '../dto/update-soppingListItem.dto';
import { QueryShoppingListItemDto } from '../dto/query-shoppingListItem.dto';
import { PantryItemService } from '../../pantryItem/services/pantryItem.service';
import { PantryService } from '../../pantry/services/pantry.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { FoodRepository } from '../../food/repositories/food.repository';
import { ShoppingListRepository } from '../../shoppingList/repositories/shoppingList.repository';

describe('ShoppingListItemService', () => {
  let service: ShoppingListItemService;
  let repository: jest.Mocked<ShoppingListItemRepository>;

  const mockPrismaService = {
    shoppingList: {
      findFirst: jest.fn(),
    },
    food: {
      findUnique: jest.fn(),
    },
    shoppingListItem: {
      create: jest.fn(),
    },
  };

  const mockShoppingListItem = {
    id: '1',
    quantity: 2,
    unit: 'KG' as const,
    notes: 'Test notes',
    checked: false,
    shoppingListId: 'list-1',
    foodId: 'food-1',
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
      name: 'Test Food',
      id: 'food-1',
      description: null,
      barcode: null,
      openFoodFactsId: null,
      createdBy: 'user-1',
      category: 'Test Category',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  };

  const mockShoppingList = {
    id: 'list-1',
    title: 'Test List',
    userId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockFood = {
    id: 'food-1',
    name: 'Test Food',
  };

  const mockUser = {
    id: 'user-1',
    shouldAutoAddToPantry: true,
  };

  const mockUserRepository = {
    findById: jest.fn(),
  };

  const mockPantryItemService = {
    createFromShoppingList: jest.fn(),
  };

  const mockPantryService = {
    getAllPantriesByUserId: jest.fn(),
    validatePantryExists: jest.fn(),
  };

  const mockFoodRepository = {
    findById: jest.fn(),
  };

  const mockShoppingListRepository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findByShoppingListId: jest.fn(),
      findById: jest.fn(),
      findByShoppingListAndFood: jest.fn(),
      update: jest.fn(),
      toggleChecked: jest.fn(),
      delete: jest.fn(),
      clearCheckedItems: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShoppingListItemService,
        {
          provide: ShoppingListItemRepository,
          useValue: mockRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PantryItemService,
          useValue: mockPantryItemService,
        },
        {
          provide: PantryService,
          useValue: mockPantryService,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: FoodRepository,
          useValue: mockFoodRepository,
        },
        {
          provide: ShoppingListRepository,
          useValue: mockShoppingListRepository,
        },
      ],
    }).compile();

    service = module.get<ShoppingListItemService>(ShoppingListItemService);
    repository = module.get(ShoppingListItemRepository);

    jest
      .spyOn(service, 'transformToResponseDto' as any)
      .mockImplementation((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes === null ? undefined : item.notes,
        checked: item.checked,
        shoppingListId: item.shoppingListId,
        foodId: item.foodId,
        shoppingList: item.shoppingList,
        food: item.food,
      }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateShoppingListItemDto = {
      quantity: 2,
      unit: 'KG',
      notes: 'Test notes',
      checked: false,
      shoppingListId: 'list-1',
      foodId: 'food-1',
    };

    it('should create a shopping list item successfully', async () => {
      mockShoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      mockFoodRepository.findById.mockResolvedValue(mockFood);
      repository.findByShoppingListAndFood.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockShoppingListItem);

      const result = await service.create(createDto, 'user-1');

      expect(mockShoppingListRepository.findById).toHaveBeenCalledWith(
        'list-1',
      );
      expect(mockFoodRepository.findById).toHaveBeenCalledWith('food-1');
      expect(repository.findByShoppingListAndFood).toHaveBeenCalledWith(
        'list-1',
        'food-1',
      );
      expect(repository.create).toHaveBeenCalledWith(createDto);

      expect(result.id).toBe('1');
      expect(result.quantity).toBe(2);
    });

    it('should throw NotFoundException if shopping list not found', async () => {
      mockShoppingListRepository.findById.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockFoodRepository.findById).not.toHaveBeenCalled();
      expect(repository.findByShoppingListAndFood).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if food not found', async () => {
      mockShoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      mockFoodRepository.findById.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if item already exists', async () => {
      mockShoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      mockFoodRepository.findById.mockResolvedValue(mockFood);
      repository.findByShoppingListAndFood.mockResolvedValue(
        mockShoppingListItem,
      );

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        ConflictException,
      );

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on repository error', async () => {
      mockShoppingListRepository.findById.mockResolvedValue(mockShoppingList);
      mockFoodRepository.findById.mockResolvedValue(mockFood);
      repository.findByShoppingListAndFood.mockResolvedValue(null);
      repository.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
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

      expect(repository.update).toHaveBeenCalled();
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

  describe('toggleChecked edge cases', () => {
    it('should throw NotFoundException when item not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.toggleChecked('item-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(repository.toggleChecked).not.toHaveBeenCalled();
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
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

      await expect(service.toggleChecked('item-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );

      expect(repository.toggleChecked).not.toHaveBeenCalled();
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('buildUpdateData (tested indirectly through update)', () => {
    it('should filter out undefined values from updateDto', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const updateDto: UpdateShoppingListItemDto = {
        quantity: 5,
        unit: undefined,
        notes: 'test',
        checked: undefined,
        shoppingListId: undefined,
        foodId: undefined,
      };

      repository.findById.mockResolvedValue(mockShoppingListItem);
      repository.update.mockResolvedValue({
        ...mockShoppingListItem,
        quantity: 5,
        notes: 'test',
      });

      await service.update(itemId, updateDto, userId);

      expect(repository.update).toHaveBeenCalled();
    });
  });

  describe('toggleChecked', () => {
    const itemId = 'item-1';
    const userId = 'user-1';
    const pantryId = 'pantry-1';

    it('should create pantry item when checking item and user preference is enabled', async () => {
      repository.findById.mockResolvedValue(mockShoppingListItem);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      repository.toggleChecked.mockResolvedValue({
        ...mockShoppingListItem,
        checked: true,
      });
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPantryItemService.createFromShoppingList.mockResolvedValue({
        id: 'pantry-item-1',
      });

      const result = await service.toggleChecked(itemId, userId);

      expect(result.checked).toBe(true);
      expect(mockPantryService.validatePantryExists).toHaveBeenCalledWith(
        userId,
      );
      expect(mockPantryItemService.createFromShoppingList).toHaveBeenCalled();
    });

    it('should not create pantry item when unchecking item', async () => {
      const checkedItem = { ...mockShoppingListItem, checked: true };
      repository.findById.mockResolvedValue(checkedItem);
      repository.toggleChecked.mockResolvedValue({
        ...checkedItem,
        checked: false,
      });

      const result = await service.toggleChecked(itemId, userId);

      expect(result.checked).toBe(false);
      expect(mockPantryService.validatePantryExists).not.toHaveBeenCalled();
      expect(
        mockPantryItemService.createFromShoppingList,
      ).not.toHaveBeenCalled();
    });

    it('should not create pantry item when user preference is false', async () => {
      const userWithPreferenceFalse = {
        ...mockUser,
        shouldAutoAddToPantry: false,
      };
      repository.findById.mockResolvedValue(mockShoppingListItem);
      mockUserRepository.findById.mockResolvedValue(userWithPreferenceFalse);
      repository.toggleChecked.mockResolvedValue({
        ...mockShoppingListItem,
        checked: true,
      });

      const result = await service.toggleChecked(itemId, userId);

      expect(result.checked).toBe(true);
      expect(mockPantryService.validatePantryExists).not.toHaveBeenCalled();
      expect(
        mockPantryItemService.createFromShoppingList,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when pantry not found', async () => {
      repository.findById.mockResolvedValue(mockShoppingListItem);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      repository.toggleChecked.mockResolvedValue({
        ...mockShoppingListItem,
        checked: true,
      });
      mockPantryService.validatePantryExists.mockRejectedValue(
        new NotFoundException('Pantry not found'),
      );

      await expect(service.toggleChecked(itemId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own pantry', async () => {
      repository.findById.mockResolvedValue(mockShoppingListItem);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      repository.toggleChecked.mockResolvedValue({
        ...mockShoppingListItem,
        checked: true,
      });
      mockPantryService.validatePantryExists.mockRejectedValue(
        new ForbiddenException('No permission'),
      );

      await expect(service.toggleChecked(itemId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException when food already exists in pantry', async () => {
      repository.findById.mockResolvedValue(mockShoppingListItem);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      repository.toggleChecked.mockResolvedValue({
        ...mockShoppingListItem,
        checked: true,
      });
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPantryItemService.createFromShoppingList.mockRejectedValue(
        new ConflictException('This food item is already in your pantry'),
      );

      await expect(service.toggleChecked(itemId, userId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      repository.findById.mockResolvedValue(mockShoppingListItem);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.toggleChecked(itemId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
