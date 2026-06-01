import { Test, TestingModule } from '@nestjs/testing';
import { PantryItemService } from './pantry-items.service';
import { PantryItemRepository } from '../repositories/pantry-items.repository';
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
import { GenericFoodRepository } from '../../generic-foods/repositories/generic-food.repository';
import { FoodProductRepository } from '../../food-products/repositories/food-product.repository';
import { ShelfLifeService } from '../../shelf-life/services/shelf-life.service';
import { TEST_IDS, TEST_DATA } from '../../common/test-utils/test-constants';
import {
  createMockPantryItemRepository,
  createMockPantryService,
  createMockGenericFoodRepository,
  createMockFoodProductRepository,
  createMockShelfLifeService,
  createMockPantryItemWithRelations,
  setupSuccessfulCreateMocks,
} from '../test-utils/pantry-items-mocks';

describe('PantryItemService', () => {
  let service: PantryItemService;
  let repository: PantryItemRepository;
  let pantryService: PantryService;

  const mockPantryItemRepository = createMockPantryItemRepository();
  const mockPantryService = createMockPantryService();
  const mockGenericFoodRepository = createMockGenericFoodRepository();
  const mockFoodRepository = createMockFoodProductRepository();
  const mockShelfLifeService = createMockShelfLifeService();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PantryItemService,
        {
          provide: PantryItemRepository,
          useValue: mockPantryItemRepository,
        },
        {
          provide: PantryService,
          useValue: mockPantryService,
        },
        {
          provide: GenericFoodRepository,
          useValue: mockGenericFoodRepository,
        },
        {
          provide: FoodProductRepository,
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
    // Restore default implementation in case a previous test set mockRejectedValue
    mockShelfLifeService.resolveExpiryDate.mockResolvedValue({
      expiryDate: undefined,
      source: undefined,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = TEST_IDS.USER;

    it('should create a new pantry item when valid DTO and userId are provided', async () => {
      const createDto = PantryItemsTestBuilder.createCreatePantryItemDto();
      const mockPantryItem = createMockPantryItemWithRelations();
      setupSuccessfulCreateMocks({
        mockPantryService,
        mockFoodRepository,
        mockPantryItemRepository,
      });
      mockPantryItemRepository.create.mockResolvedValue(mockPantryItem);

      const result = await service.create(createDto, userId);

      expect(result.id).toBe(TEST_IDS.PANTRY_ITEM);
      expect(result.quantity).toBe(TEST_DATA.QUANTITY);
      expect(result.pantryId).toBe(TEST_IDS.PANTRY);
      expect(pantryService.validatePantryExists).toHaveBeenCalled();
      expect(mockFoodRepository.findById).toHaveBeenCalled();
      expect(repository.findFoodProductInPantry).toHaveBeenCalled();
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
      mockPantryItemRepository.findFoodProductInPantry.mockResolvedValue(
        mockPantryItem,
      );

      await expect(service.create(createDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException when creation fails unexpectedly', async () => {
      const createDto = PantryItemsTestBuilder.createCreatePantryItemDto();
      setupSuccessfulCreateMocks({
        mockPantryService,
        mockFoodRepository,
        mockPantryItemRepository,
      });
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
      setupSuccessfulCreateMocks({
        mockPantryService,
        mockFoodRepository,
        mockPantryItemRepository,
      });
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
      setupSuccessfulCreateMocks({
        mockPantryService,
        mockFoodRepository,
        mockPantryItemRepository,
      });
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
      setupSuccessfulCreateMocks({
        mockPantryService,
        mockFoodRepository,
        mockPantryItemRepository,
      });
      mockPantryItemRepository.create.mockResolvedValue({
        ...mockPantryItem,
        unit: Unit.PIECES,
      });

      await service.create(createDtoWithoutUnit, userId);

      expect(mockPantryItemRepository.create).toHaveBeenCalled();
    });

    describe('expiry date priority chain', () => {
      const SHELF_LIFE_ID = 'shelf-life-id-1';

      function setupFood(
        overrides: Partial<{
          shelfLifeId: string | null;
          categories: string[];
          name: string;
        }> = {},
      ) {
        mockPantryService.validatePantryExists.mockResolvedValue(
          TEST_IDS.PANTRY,
        );
        mockFoodRepository.findById.mockResolvedValue({
          id: TEST_IDS.FOOD,
          name: overrides.name ?? 'Milk',
          shelfLifeId:
            overrides.shelfLifeId !== undefined
              ? overrides.shelfLifeId
              : SHELF_LIFE_ID,
          categories: overrides.categories ?? [],
        });
        mockPantryItemRepository.findFoodProductInPantry.mockResolvedValue(
          null,
        );
        mockShelfLifeService.inferStorageType.mockReturnValue('refrigerator');
        mockShelfLifeService.getDaysForStorageType.mockReturnValue(7);
      }

      it('should call resolveExpiryDate with shelfLifeId, foodName, and categoryHints from food', async () => {
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          expiryDate: undefined,
        });
        const mockPantryItem = createMockPantryItemWithRelations();
        setupFood({
          shelfLifeId: SHELF_LIFE_ID,
          categories: ['en:dairy-products'],
        });
        mockPantryItemRepository.create.mockResolvedValue(mockPantryItem);

        await service.create(createDto, userId);

        expect(mockShelfLifeService.resolveExpiryDate).toHaveBeenCalledWith({
          shelfLifeId: SHELF_LIFE_ID,
          foodName: 'Milk',
          categoryHints: ['dairy products'],
        });
      });

      it('should set expiryDate and source from resolveExpiryDate result', async () => {
        const autoExpiry = new Date('2026-09-01');
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          expiryDate: undefined,
        });
        const mockPantryItem = createMockPantryItemWithRelations();
        setupFood();
        mockShelfLifeService.resolveExpiryDate.mockResolvedValue({
          expiryDate: autoExpiry,
          source: 'auto_foodkeeper',
        });
        mockPantryItemRepository.create.mockResolvedValue(mockPantryItem);

        await service.create(createDto, userId);

        const createCall = mockPantryItemRepository.create.mock.calls[0][0];
        expect(createCall.expiryDate).toEqual(autoExpiry);
        expect(createCall.expiryDateSource).toBe('auto_foodkeeper');
      });

      it('should leave expiryDate undefined when resolveExpiryDate returns undefined', async () => {
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          expiryDate: undefined,
        });
        setupFood({ shelfLifeId: null });
        const fuzzyExpiry = new Date('2026-05-01');
        mockShelfLifeService.calculateExpiryDate.mockResolvedValue({
          expiryDate: fuzzyExpiry,
          source: 'auto_foodkeeper',
        });

        await service.create(createDto, userId);

        const createCall = mockPantryItemRepository.create.mock.calls[0][0];
        expect(createCall.expiryDate).toBeUndefined();
        expect(createCall.expiryDateSource).toBeUndefined();
      });

      it('should override auto expiry with manual expiryDate', async () => {
        const autoExpiry = new Date('2026-06-01');
        const manualExpiry = new Date('2026-12-31');
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          expiryDate: manualExpiry,
        });
        const mockPantryItem = createMockPantryItemWithRelations();
        setupFood();
        mockShelfLifeService.resolveExpiryDate.mockResolvedValue({
          expiryDate: autoExpiry,
          source: 'auto_foodkeeper',
        });
        mockPantryItemRepository.create.mockResolvedValue(mockPantryItem);

        await service.create(createDto, userId);

        const createCall = mockPantryItemRepository.create.mock.calls[0][0];
        expect(createCall.expiryDate).toEqual(manualExpiry);
        expect(createCall.expiryDateSource).toBe('manual');
      });

      it('should use manual expiryDate even when resolveExpiryDate returns undefined', async () => {
        const manualExpiry = new Date('2026-12-31');
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          expiryDate: manualExpiry,
        });
        const mockPantryItem = createMockPantryItemWithRelations();
        setupFood();
        mockShelfLifeService.resolveExpiryDate.mockResolvedValue({
          expiryDate: undefined,
          source: undefined,
        });
        mockPantryItemRepository.create.mockResolvedValue(mockPantryItem);

        await service.create(createDto, userId);

        const createCall = mockPantryItemRepository.create.mock.calls[0][0];
        expect(createCall.expiryDate).toEqual(manualExpiry);
        expect(createCall.expiryDateSource).toBe('manual');
      });

      it('should pass normalised OFF category tags as categoryHints', async () => {
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          expiryDate: undefined,
        });
        const mockPantryItem = createMockPantryItemWithRelations();
        setupFood({
          shelfLifeId: null,
          categories: ['en:dairy-products', 'en:cheeses'],
          name: 'Cheddar',
        });
        mockPantryItemRepository.create.mockResolvedValue({
          ...mockPantryItem,
          expiryDate: null,
        });

        await service.create(createDto, userId);

        expect(mockShelfLifeService.resolveExpiryDate).toHaveBeenCalledWith({
          shelfLifeId: null,
          foodName: 'Cheddar',
          categoryHints: ['dairy products', 'cheeses'],
        });
      });

      it('should use FK shelf life for genericFood when shelfLifeId is set', async () => {
        const FOOD_CAT_ID = 'food-cat-id-1';
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          foodProductId: undefined,
          genericFoodId: FOOD_CAT_ID,
          expiryDate: undefined,
        });
        const mockPantryItem = createMockPantryItemWithRelations();
        mockPantryService.validatePantryExists.mockResolvedValue(
          TEST_IDS.PANTRY,
        );
        mockGenericFoodRepository.findById.mockResolvedValue({
          id: FOOD_CAT_ID,
          foodName: 'Gouda',
          foodGroup: 'Milk and milk products',
          shelfLifeId: SHELF_LIFE_ID,
        });
        mockPantryItemRepository.findGenericFoodInPantry.mockResolvedValue(
          null,
        );
        mockPantryItemRepository.create.mockResolvedValue({
          ...mockPantryItem,
          expiryDate: null,
        });

        await service.create(createDto, userId);

        expect(mockShelfLifeService.resolveExpiryDate).toHaveBeenCalledWith({
          shelfLifeId: SHELF_LIFE_ID,
          foodName: 'Gouda',
          categoryHints: ['milk and milk products'],
        });
      });

      it('should propagate unexpected errors from resolveExpiryDate as BadRequestException', async () => {
        const createDto = PantryItemsTestBuilder.createCreatePantryItemDto({
          expiryDate: undefined,
        });
        setupFood();
        mockShelfLifeService.resolveExpiryDate.mockRejectedValue(
          new Error('Unexpected DB failure'),
        );

        await expect(service.create(createDto, userId)).rejects.toThrow(
          BadRequestException,
        );
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

    it('should return filtered pantry items when foodProductId and unit are provided', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockFoodRepository.findById.mockResolvedValue({
        id: TEST_IDS.FOOD,
        name: 'Tomatoes',
      });
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemsTestBuilder.createQueryPantryItemDto({
        foodProductId: TEST_IDS.FOOD,
        unit: Unit.KG,
      });
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      expect(pantryService.validatePantryExists).toHaveBeenCalled();
      expect(mockFoodRepository.findById).toHaveBeenCalled();
      expect(repository.findMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException when foodProductId is provided but food does not exist', async () => {
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockFoodRepository.findById.mockResolvedValue(null);

      const query = PantryItemsTestBuilder.createQueryPantryItemDto({
        foodProductId: 'non-existent-food',
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

    it('should filter by foodProductId only when foodProductId is provided without unit', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockFoodRepository.findById.mockResolvedValue({
        id: TEST_IDS.FOOD,
        name: 'Tomatoes',
      });
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemsTestBuilder.createQueryPantryItemDto({
        foodProductId: TEST_IDS.FOOD,
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
        foodProductId: TEST_IDS.FOOD,
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
      expect(filterCall.expiryDate).toBeUndefined();
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
      const updateDto = PantryItemsTestBuilder.createUpdatePantryItemDto({
        foodProductId: 'food-1',
      });
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

    it('should update pantry item without requiring food reference fields', async () => {
      const updateDto: UpdatePantryItemDto = {
        quantity: 3,
        unit: Unit.KG,
        notes: 'Buy organic if available',
        expiryDate: '2026-03-15' as unknown as Date,
      };
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPantryItemRepository.update.mockResolvedValue({
        ...mockPantryItem,
        ...updateDto,
      });

      const result = await service.update(itemId, updateDto, userId);

      expect(result.quantity).toBe(3);
      expect(result.unit).toBe(Unit.KG);
      expect(mockFoodRepository.findById).not.toHaveBeenCalled();
      expect(mockGenericFoodRepository.findById).not.toHaveBeenCalled();
    });

    it('should validate new food when foodProductId is provided in update', async () => {
      const updateDto = PantryItemsTestBuilder.createUpdatePantryItemDto({
        foodProductId: 'food-2',
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
        foodProductId: 'food-999',
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
          meta: { target: ['pantryId', 'foodProductId'] },
        },
      );
      mockPantryItemRepository.update.mockRejectedValue(prismaError);

      await expect(
        service.update(itemId, { foodProductId: 'food-2' }, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('should transform expiryDate string to Date object when updating', async () => {
      const updateDtoWithStringDate: Omit<UpdatePantryItemDto, 'expiryDate'> & {
        expiryDate: string;
        foodProductId: string;
      } = {
        quantity: 10,
        expiryDate: '2027-02-02',
        foodProductId: 'food-1',
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
        foodProductId: 'food-1',
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
        foodProductId: string;
      } = {
        quantity: 100,
        unit: Unit.G,
        notes: 'Buy organic if available',
        expiryDate: '2027-03-15',
        foodProductId: 'food-1',
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
        foodProductId: TEST_IDS.FOOD,
        quantity: TEST_DATA.QUANTITY,
        unit: Unit.KG,
      });
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      setupSuccessfulCreateMocks({
        mockPantryService,
        mockFoodRepository,
        mockPantryItemRepository,
      });
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
