import { Test, TestingModule } from '@nestjs/testing';
import { PantryItemService } from './pantry-items.service';
import { PantryItemRepository } from '../repositories/pantry-items.repository';
import { PrismaService } from '../../database/prisma.service';
import { PantryService } from './pantry.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Unit } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ERROR_CODES } from '../../common/utils/error.utils';
import { CreateShoppingListItemDto } from '../../shopping-lists/dto/create-shopping-list-item.dto';
import { CreatePantryItemDto } from '../dto/create-pantry-item.dto';
import { UpdatePantryItemDto } from '../dto/update-pantry-item.dto';
import { PantryItemsTestBuilder } from '../test-utils/pantry-items-test-builders';
import { FoodCategoriesRepository } from '../../food-category/repositories/food-categories.repository';
import { FoodRepository } from '../../foods/repositories/food.repository';
import { ShelfLifeService } from '../../shelf-life/services/shelf-life.service';
import {
  TEST_IDS,
  TEST_DATA,
  TEST_DATES,
} from '../../common/test-utils/test-constants';

describe('PantryItemService', () => {
  let service: PantryItemService;
  let repository: PantryItemRepository;
  let pantryService: PantryService;

  const mockPrismaService = {
    pantryItem: {
      create: jest.fn(),
    },
    food: {
      findUnique: jest.fn(),
    },
    foodShelfLife: {
      findUnique: jest.fn(),
    },
  };

  const mockPantryItemRepository = {
    create: jest.fn(),
    findFoodInPantry: jest.fn(),
    findFoodCategoryInPantry: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockPantryService = {
    validatePantryExists: jest.fn(),
  };

  const mockFoodCategoriesRepository = {
    findById: jest.fn(),
  };

  const mockFoodRepository = {
    findById: jest.fn(),
  };

  const mockShelfLifeService = {
    calculateExpiryDate: jest.fn().mockResolvedValue({
      expiryDate: null,
      source: null,
    }),
    inferStorageType: jest.fn().mockReturnValue('refrigerator'),
    getDaysForStorageType: jest.fn().mockReturnValue(7),
  };

  function createMockPantryItemWithRelations() {
    return {
      id: TEST_IDS.PANTRY_ITEM,
      quantity: TEST_DATA.QUANTITY,
      unit: Unit.KG,
      notes: TEST_DATA.NOTES,
      expiryDate: TEST_DATES.EXPIRY,
      pantryId: TEST_IDS.PANTRY,
      foodId: TEST_IDS.FOOD,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      pantry: {
        id: TEST_IDS.PANTRY,
        title: 'My Pantry',
        userId: TEST_IDS.USER,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      food: {
        id: TEST_IDS.FOOD,
        name: 'Tomatoes',
        category: 'Vegetables',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    };
  }

  function setupSuccessfulCreateMocks() {
    mockPantryService.validatePantryExists.mockResolvedValue(TEST_IDS.PANTRY);
    mockFoodRepository.findById.mockResolvedValue({
      id: TEST_IDS.FOOD,
      name: 'Tomatoes',
    });
    mockPantryItemRepository.findFoodInPantry.mockResolvedValue(null);
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PantryItemService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PantryItemRepository,
          useValue: mockPantryItemRepository,
        },
        {
          provide: PantryService,
          useValue: mockPantryService,
        },
        {
          provide: FoodCategoriesRepository,
          useValue: mockFoodCategoriesRepository,
        },
        {
          provide: FoodRepository,
          useValue: mockFoodRepository,
        },
        {
          provide: ShelfLifeService,
          useValue: mockShelfLifeService,
        },
      ],
    }).compile();

    service = module.get<PantryItemService>(PantryItemService);
    repository = module.get<PantryItemRepository>(PantryItemRepository);
    pantryService = module.get<PantryService>(PantryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = TEST_IDS.USER;

    it('should create a new pantry item when valid DTO and userId are provided', async () => {
      const createDto = PantryItemsTestBuilder.createCreatePantryItemDto();
      const mockPantryItem = createMockPantryItemWithRelations();
      setupSuccessfulCreateMocks();
      mockPantryItemRepository.create.mockResolvedValue(mockPantryItem);

      const result = await service.create(createDto, userId);

      expect(result.id).toBe(TEST_IDS.PANTRY_ITEM);
      expect(result.quantity).toBe(TEST_DATA.QUANTITY);
      expect(result.pantryId).toBe(TEST_IDS.PANTRY);
      expect(pantryService.validatePantryExists).toHaveBeenCalled();
      expect(mockFoodRepository.findById).toHaveBeenCalled();
      expect(repository.findFoodInPantry).toHaveBeenCalled();
      expect(mockPantryItemRepository.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when food does not exist', async () => {
      const createDto = PantryItemsTestBuilder.createCreatePantryItemDto();
      mockPantryService.validatePantryExists.mockResolvedValue(TEST_IDS.PANTRY);
      mockFoodRepository.findById.mockResolvedValue(null);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when food already exists in pantry', async () => {
      const createDto = PantryItemsTestBuilder.createCreatePantryItemDto();
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryService.validatePantryExists.mockResolvedValue(TEST_IDS.PANTRY);
      mockFoodRepository.findById.mockResolvedValue({
        id: TEST_IDS.FOOD,
        name: 'Tomatoes',
      });
      mockPantryItemRepository.findFoodInPantry.mockResolvedValue(
        mockPantryItem,
      );

      await expect(service.create(createDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException when creation fails unexpectedly', async () => {
      const createDto = PantryItemsTestBuilder.createCreatePantryItemDto();
      setupSuccessfulCreateMocks();
      mockPantryItemRepository.create.mockRejectedValue(new Error('DB Error'));

      await expect(service.create(createDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should transform expiryDate string to Date object when creating', async () => {
      const createDtoWithStringDate: Omit<CreatePantryItemDto, 'expiryDate'> & {
        expiryDate: string;
      } = {
        ...PantryItemsTestBuilder.createCreatePantryItemDto(),
        expiryDate: '2027-02-02',
      };

      const mockPantryItem = createMockPantryItemWithRelations();
      setupSuccessfulCreateMocks();
      mockPantryItemRepository.create.mockResolvedValue(mockPantryItem);

      await service.create(
        createDtoWithStringDate as unknown as CreatePantryItemDto,
        userId,
      );

      expect(mockPantryItemRepository.create).toHaveBeenCalled();

      const createCall = mockPantryItemRepository.create.mock.calls[0][0];
      expect(createCall.expiryDate).toBeInstanceOf(Date);
      expect(createCall.expiryDate.toISOString()).toContain('2027-02-02');
    });

    it('should handle undefined expiryDate when creating', async () => {
      const createDtoWithoutDate =
        PantryItemsTestBuilder.createCreatePantryItemDto({
          expiryDate: undefined,
        });
      const mockPantryItem = createMockPantryItemWithRelations();
      setupSuccessfulCreateMocks();
      mockPantryItemRepository.create.mockResolvedValue({
        ...mockPantryItem,
        expiryDate: null,
      });

      await service.create(createDtoWithoutDate, userId);

      expect(mockPantryItemRepository.create).toHaveBeenCalled();
    });

    it('should default unit to PIECES when unit is not provided', async () => {
      const createDtoWithoutUnit =
        PantryItemsTestBuilder.createCreatePantryItemDto();
      delete (createDtoWithoutUnit as any).unit;
      const mockPantryItem = createMockPantryItemWithRelations();
      setupSuccessfulCreateMocks();
      mockPantryItemRepository.create.mockResolvedValue({
        ...mockPantryItem,
        unit: Unit.PIECES,
      });

      await service.create(createDtoWithoutUnit, userId);

      expect(mockPantryItemRepository.create).toHaveBeenCalled();
    });

    describe('expiry date priority chain', () => {
      const SHELF_LIFE_ID = 'shelf-life-id-1';
      const mockShelfLife = {
        id: SHELF_LIFE_ID,
        name: 'Milk, whole',
        categoryName: 'Dairy Products & Eggs',
        defaultStorageType: 'refrigerator',
        refrigeratorMinDays: 5,
        refrigeratorMaxDays: 7,
        pantryMinDays: null,
        pantryMaxDays: null,
        freezerMinDays: 30,
        freezerMaxDays: 60,
        keywords: ['milk'],
        foodKeeperProductId: 1,
      };

      function setupFoodWithShelfLife(
        shelfLifeId: string | null = SHELF_LIFE_ID,
      ) {
        mockPantryService.validatePantryExists.mockResolvedValue(
          TEST_IDS.PANTRY,
        );
        mockFoodRepository.findById.mockResolvedValue({
          id: TEST_IDS.FOOD,
          name: 'Milk',
          shelfLifeId,
        });
        mockPantryItemRepository.findFoodInPantry.mockResolvedValue(null);
        mockPrismaService.foodShelfLife.findUnique.mockResolvedValue(
          mockShelfLife,
        );
        mockShelfLifeService.inferStorageType.mockReturnValue('refrigerator');
        mockShelfLifeService.getDaysForStorageType.mockReturnValue(7);
      }

      it('should use FK-linked shelf life when food has shelfLifeId', async () => {
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          expiryDate: undefined,
        });
        const mockPantryItem = createMockPantryItemWithRelations();
        setupFoodWithShelfLife(SHELF_LIFE_ID);
        mockPantryItemRepository.create.mockResolvedValue(mockPantryItem);

        await service.create(createDto, userId);

        expect(mockPrismaService.foodShelfLife.findUnique).toHaveBeenCalledWith(
          {
            where: { id: SHELF_LIFE_ID },
          },
        );
        expect(mockShelfLifeService.inferStorageType).toHaveBeenCalledWith(
          mockShelfLife,
        );
        expect(mockShelfLifeService.getDaysForStorageType).toHaveBeenCalledWith(
          mockShelfLife,
          'refrigerator',
        );
        expect(mockShelfLifeService.calculateExpiryDate).not.toHaveBeenCalled();
        const createCall = mockPantryItemRepository.create.mock.calls[0][0];
        expect(createCall.expiryDate).toBeInstanceOf(Date);
        expect(createCall.expiryDateSource).toBe('auto_foodkeeper');
      });

      it('should set expiry date ~7 days from now when FK shelf life returns 7 days', async () => {
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          expiryDate: undefined,
        });
        const mockPantryItem = createMockPantryItemWithRelations();
        setupFoodWithShelfLife(SHELF_LIFE_ID);
        mockShelfLifeService.getDaysForStorageType.mockReturnValue(7);
        mockPantryItemRepository.create.mockResolvedValue(mockPantryItem);
        const before = new Date();

        await service.create(createDto, userId);

        const after = new Date();
        const createCall = mockPantryItemRepository.create.mock.calls[0][0];
        const expiryDate: Date = createCall.expiryDate;
        const expectedMin = new Date(before);
        expectedMin.setDate(expectedMin.getDate() + 7);
        const expectedMax = new Date(after);
        expectedMax.setDate(expectedMax.getDate() + 7);
        expect(expiryDate.getTime()).toBeGreaterThanOrEqual(
          expectedMin.getTime(),
        );
        expect(expiryDate.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
      });

      it('should fall back to fuzzy calculateExpiryDate when food has no shelfLifeId', async () => {
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          expiryDate: undefined,
        });
        const mockPantryItem = createMockPantryItemWithRelations();
        setupFoodWithShelfLife(null); // no FK link
        const fuzzyExpiry = new Date('2026-05-01');
        mockShelfLifeService.calculateExpiryDate.mockResolvedValue({
          expiryDate: fuzzyExpiry,
          source: 'auto_foodkeeper',
        });
        mockPantryItemRepository.create.mockResolvedValue(mockPantryItem);

        await service.create(createDto, userId);

        expect(
          mockPrismaService.foodShelfLife.findUnique,
        ).not.toHaveBeenCalled();
        expect(mockShelfLifeService.calculateExpiryDate).toHaveBeenCalledWith(
          'Milk',
        );
        const createCall = mockPantryItemRepository.create.mock.calls[0][0];
        expect(createCall.expiryDate).toEqual(fuzzyExpiry);
        expect(createCall.expiryDateSource).toBe('auto_foodkeeper');
      });

      it('should override auto-calculated expiry with manual date when provided', async () => {
        const manualExpiry = new Date('2026-12-31');
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          expiryDate: manualExpiry,
        });
        const mockPantryItem = createMockPantryItemWithRelations();
        setupFoodWithShelfLife(SHELF_LIFE_ID);
        mockPantryItemRepository.create.mockResolvedValue(mockPantryItem);

        await service.create(createDto, userId);

        // FK lookup still runs (auto-calc happens first)
        expect(mockPrismaService.foodShelfLife.findUnique).toHaveBeenCalled();
        const createCall = mockPantryItemRepository.create.mock.calls[0][0];
        expect(createCall.expiryDate).toEqual(manualExpiry);
        expect(createCall.expiryDateSource).toBe('manual');
      });

      it('should set manual source and override even when FK link exists', async () => {
        const manualExpiry = new Date('2026-06-01');
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          expiryDate: manualExpiry,
        });
        const mockPantryItem = createMockPantryItemWithRelations();
        setupFoodWithShelfLife(SHELF_LIFE_ID);
        mockShelfLifeService.getDaysForStorageType.mockReturnValue(3);
        mockPantryItemRepository.create.mockResolvedValue(mockPantryItem);

        await service.create(createDto, userId);

        const createCall = mockPantryItemRepository.create.mock.calls[0][0];
        // Manual date wins over the 3-day auto-calc
        expect(createCall.expiryDate).toEqual(manualExpiry);
        expect(createCall.expiryDateSource).toBe('manual');
      });

      it('should leave expiryDate undefined when FK shelf life returns no days', async () => {
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          expiryDate: undefined,
        });
        const mockPantryItem = createMockPantryItemWithRelations();
        setupFoodWithShelfLife(SHELF_LIFE_ID);
        mockShelfLifeService.getDaysForStorageType.mockReturnValue(null);
        mockPantryItemRepository.create.mockResolvedValue(mockPantryItem);

        await service.create(createDto, userId);

        const createCall = mockPantryItemRepository.create.mock.calls[0][0];
        expect(createCall.expiryDate).toBeUndefined();
        expect(createCall.expiryDateSource).toBeUndefined();
      });

      it('should leave expiryDate undefined when FK lookup returns null', async () => {
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          expiryDate: undefined,
        });
        const mockPantryItem = createMockPantryItemWithRelations();
        setupFoodWithShelfLife(SHELF_LIFE_ID);
        mockPrismaService.foodShelfLife.findUnique.mockResolvedValue(null);
        mockPantryItemRepository.create.mockResolvedValue(mockPantryItem);

        await service.create(createDto, userId);

        const createCall = mockPantryItemRepository.create.mock.calls[0][0];
        expect(createCall.expiryDate).toBeUndefined();
        expect(createCall.expiryDateSource).toBeUndefined();
      });

      it('should use FK shelf life for foodCategory when shelfLifeId is set', async () => {
        const FOOD_CAT_ID = 'food-cat-id-1';
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          foodId: undefined,
          foodCategoryId: FOOD_CAT_ID,
          expiryDate: undefined,
        });
        const mockPantryItem = createMockPantryItemWithRelations();
        mockPantryService.validatePantryExists.mockResolvedValue(
          TEST_IDS.PANTRY,
        );
        mockFoodCategoriesRepository.findById.mockResolvedValue({
          id: FOOD_CAT_ID,
          foodName: 'Whole milk',
          foodGroup: 'Milk and milk products',
          shelfLifeId: SHELF_LIFE_ID,
        });
        mockPantryItemRepository.findFoodCategoryInPantry.mockResolvedValue(
          null,
        );
        mockPrismaService.foodShelfLife.findUnique.mockResolvedValue(
          mockShelfLife,
        );
        mockShelfLifeService.inferStorageType.mockReturnValue('refrigerator');
        mockShelfLifeService.getDaysForStorageType.mockReturnValue(7);
        mockPantryItemRepository.create.mockResolvedValue(mockPantryItem);

        await service.create(createDto, userId);

        expect(mockPrismaService.foodShelfLife.findUnique).toHaveBeenCalledWith(
          {
            where: { id: SHELF_LIFE_ID },
          },
        );
        expect(mockShelfLifeService.calculateExpiryDate).not.toHaveBeenCalled();
        const createCall = mockPantryItemRepository.create.mock.calls[0][0];
        expect(createCall.expiryDate).toBeInstanceOf(Date);
        expect(createCall.expiryDateSource).toBe('auto_foodkeeper');
      });
    });
  });

  describe('findAll', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;

    it('should return all pantry items when no filters are provided', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemsTestBuilder.createQueryPantryItemDto();
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      expect(pantryService.validatePantryExists).toHaveBeenCalled();
      expect(repository.findMany).toHaveBeenCalled();
    });

    it('should return filtered pantry items when foodId and unit are provided', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockFoodRepository.findById.mockResolvedValue({
        id: TEST_IDS.FOOD,
        name: 'Tomatoes',
      });
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemsTestBuilder.createQueryPantryItemDto({
        foodId: TEST_IDS.FOOD,
        unit: Unit.KG,
      });
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      expect(pantryService.validatePantryExists).toHaveBeenCalled();
      expect(mockFoodRepository.findById).toHaveBeenCalled();
      expect(repository.findMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException when foodId is provided but food does not exist', async () => {
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockFoodRepository.findById.mockResolvedValue(null);

      const query = PantryItemsTestBuilder.createQueryPantryItemDto({
        foodId: 'non-existent-food',
      });

      await expect(service.findAll(query, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(pantryService.validatePantryExists).toHaveBeenCalled();
      expect(mockFoodRepository.findById).toHaveBeenCalled();
      expect(repository.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array when no items are found', async () => {
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPantryItemRepository.findMany.mockResolvedValue([]);

      const query = PantryItemsTestBuilder.createQueryPantryItemDto();
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(0);
    });

    it('should not filter by unit when unit is not provided', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemsTestBuilder.createQueryPantryItemDto();
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      expect(repository.findMany).toHaveBeenCalled();
    });

    it('should filter by unit when unit is explicitly provided', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemsTestBuilder.createQueryPantryItemDto({
        unit: Unit.KG,
      });
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      expect(repository.findMany).toHaveBeenCalled();
    });

    it('should filter by foodId only when foodId is provided without unit', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockFoodRepository.findById.mockResolvedValue({
        id: TEST_IDS.FOOD,
        name: 'Tomatoes',
      });
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemsTestBuilder.createQueryPantryItemDto({
        foodId: TEST_IDS.FOOD,
      });
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      expect(repository.findMany).toHaveBeenCalled();
    });

    it('should filter by expiryDate when expiryDate is provided', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemsTestBuilder.createQueryPantryItemDto({
        expiryDate: new Date('2027-12-31'),
      });
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      expect(repository.findMany).toHaveBeenCalled();
      const filterCall = (repository.findMany as jest.Mock).mock.calls[0][0];
      expect(filterCall.expiryDate).toBeInstanceOf(Date);
      expect(filterCall.expiryDate.toISOString()).toContain('2027-12-31');
    });

    it('should convert expiryDate string to Date object when filtering', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const queryWithStringDate =
        PantryItemsTestBuilder.createQueryPantryItemDto({
          expiryDate: '2027-06-15' as any,
        });
      const result = await service.findAll(queryWithStringDate, userId);

      expect(result.data).toHaveLength(1);
      const filterCall = (repository.findMany as jest.Mock).mock.calls[0][0];
      expect(filterCall.expiryDate).toBeInstanceOf(Date);
      expect(filterCall.expiryDate.toISOString()).toContain('2027-06-15');
    });

    it('should filter by expiryDate with other filters', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockFoodRepository.findById.mockResolvedValue({
        id: TEST_IDS.FOOD,
        name: 'Tomatoes',
      });
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemsTestBuilder.createQueryPantryItemDto({
        foodId: TEST_IDS.FOOD,
        unit: Unit.KG,
        expiryDate: new Date('2027-12-31'),
      });
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      expect(repository.findMany).toHaveBeenCalled();
      const filterCall = (repository.findMany as jest.Mock).mock.calls[0][0];
      expect(filterCall.expiryDate).toBeInstanceOf(Date);
    });

    it('should not filter by expiryDate when expiryDate is not provided', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemsTestBuilder.createQueryPantryItemDto();
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      const filterCall = (repository.findMany as jest.Mock).mock.calls[0][0];
      expect(filterCall).not.toHaveProperty('expiryDate');
    });
  });

  describe('findById', () => {
    const userId = TEST_IDS.USER;
    const itemId = TEST_IDS.PANTRY_ITEM;

    it('should return pantry item when it exists and belongs to user', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);

      const result = await service.findById(itemId, userId);

      expect(result.id).toBe(itemId);
    });

    it('should throw NotFoundException when item does not exist', async () => {
      mockPantryItemRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own the pantry', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue({
        ...mockPantryItem,
        pantry: {
          ...mockPantryItem.pantry,
          userId: 'other-user',
        },
      });

      await expect(service.findById(itemId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    const userId = TEST_IDS.USER;
    const itemId = TEST_IDS.PANTRY_ITEM;

    it('should update pantry item when it exists and belongs to user', async () => {
      const updateDto = PantryItemsTestBuilder.createUpdatePantryItemDto();
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPantryItemRepository.update.mockResolvedValue({
        ...mockPantryItem,
        ...updateDto,
      });

      const result = await service.update(itemId, updateDto, userId);

      expect(result.quantity).toBe(updateDto.quantity);
      expect(result.notes).toBe(updateDto.notes);
    });

    it('should validate new food when foodId is provided in update', async () => {
      const updateDto = PantryItemsTestBuilder.createUpdatePantryItemDto({
        foodId: 'food-2',
      });
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockFoodRepository.findById.mockResolvedValue({
        id: 'food-2',
        name: 'Carrots',
      });
      mockPantryItemRepository.update.mockResolvedValue({
        ...mockPantryItem,
        ...updateDto,
      });

      await service.update(itemId, updateDto, userId);

      expect(mockFoodRepository.findById).toHaveBeenCalled();
    });

    it('should throw NotFoundException when new food does not exist', async () => {
      const updateDto = PantryItemsTestBuilder.createUpdatePantryItemDto({
        foodId: 'food-999',
      });
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockFoodRepository.findById.mockResolvedValue(null);

      await expect(service.update(itemId, updateDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when food already exists in pantry', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockFoodRepository.findById.mockResolvedValue({
        id: 'food-2',
        name: 'Carrots',
      });
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: ERROR_CODES.PRISMA_UNIQUE_CONSTRAINT,
          clientVersion: '4.0.0',
          meta: { target: ['pantryId', 'foodId'] },
        },
      );
      mockPantryItemRepository.update.mockRejectedValue(prismaError);

      await expect(
        service.update(itemId, { foodId: 'food-2' }, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('should transform expiryDate string to Date object when updating', async () => {
      const updateDtoWithStringDate: Omit<UpdatePantryItemDto, 'expiryDate'> & {
        expiryDate: string;
      } = {
        quantity: 10,
        expiryDate: '2027-02-02',
      };
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPantryItemRepository.update.mockResolvedValue({
        ...mockPantryItem,
        quantity: 10,
        expiryDate: new Date('2027-02-02'),
      });

      await service.update(
        itemId,
        updateDtoWithStringDate as unknown as UpdatePantryItemDto,
        userId,
      );

      expect(repository.update).toHaveBeenCalled();

      const updateCall = (repository.update as jest.Mock).mock.calls[0][1];
      expect(updateCall.expiryDate).toBeInstanceOf(Date);
      expect(updateCall.expiryDate.toISOString()).toContain('2027-02-02');
    });

    it('should handle undefined expiryDate when updating', async () => {
      const updateDtoWithoutDate = {
        quantity: 10,
        expiryDate: undefined,
      };
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPantryItemRepository.update.mockResolvedValue({
        ...mockPantryItem,
        quantity: 10,
      });

      await service.update(itemId, updateDtoWithoutDate, userId);

      expect(repository.update).toHaveBeenCalled();
      const updateCall = (repository.update as jest.Mock).mock.calls[0][1];
      expect(updateCall).not.toHaveProperty('expiryDate');
    });

    it('should update with all fields including date string', async () => {
      const updateDtoWithAllFields: Omit<UpdatePantryItemDto, 'expiryDate'> & {
        expiryDate: string;
      } = {
        quantity: 100,
        unit: Unit.G,
        notes: 'Buy organic if available',
        expiryDate: '2027-03-15',
      };
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPantryItemRepository.update.mockResolvedValue({
        ...mockPantryItem,
        quantity: 100,
        unit: Unit.G,
        notes: 'Buy organic if available',
        expiryDate: new Date('2027-03-15'),
      });

      const result = await service.update(
        itemId,
        updateDtoWithAllFields as unknown as UpdatePantryItemDto,
        userId,
      );

      expect(result.quantity).toBe(100);
      expect(result.unit).toBe(Unit.G);
      expect(result.notes).toBe('Buy organic if available');
      expect(repository.update).toHaveBeenCalled();
      const updateCall = (repository.update as jest.Mock).mock.calls[0][1];
      expect(updateCall.expiryDate).toBeInstanceOf(Date);
      expect(updateCall.expiryDate.toISOString()).toContain('2027-03-15');
    });
  });

  describe('remove', () => {
    const userId = TEST_IDS.USER;
    const itemId = TEST_IDS.PANTRY_ITEM;

    it('should delete pantry item when it exists and belongs to user', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPantryItemRepository.delete.mockResolvedValue(undefined);

      await service.remove(itemId, userId);

      expect(repository.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when item does not exist', async () => {
      mockPantryItemRepository.findById.mockResolvedValue(null);

      await expect(service.remove('non-existent', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own the pantry', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue({
        ...mockPantryItem,
        pantry: {
          ...mockPantryItem.pantry,
          userId: 'other-user',
        },
      });

      await expect(service.remove(itemId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createFromShoppingList', () => {
    const userId = TEST_IDS.USER;
    const pantryId = TEST_IDS.PANTRY;

    it('should create pantry item from shopping list when valid data is provided', async () => {
      const dto = Object.assign(new CreateShoppingListItemDto(), {
        foodId: TEST_IDS.FOOD,
        quantity: TEST_DATA.QUANTITY,
        unit: Unit.KG,
      });
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      setupSuccessfulCreateMocks();
      mockPantryItemRepository.create.mockResolvedValue({
        ...mockPantryItem,
        id: 'new-item',
      });

      const result = await service.createFromShoppingList(dto, userId);

      expect(pantryService.validatePantryExists).toHaveBeenCalled();
      expect(mockPantryItemRepository.create).toHaveBeenCalled();
      expect(result.id).toBe('new-item');
    });
  });
});
