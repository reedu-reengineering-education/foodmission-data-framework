import { Test, TestingModule } from '@nestjs/testing';
import { PantryItemService } from './pantryItem.service';
import { PantryItemRepository } from '../repositories/pantryItem.repository';
import { PrismaService } from '../../database/prisma.service';
import { PantryService } from '../../pantry/services/pantry.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Unit } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ERROR_CODES } from '../../common/utils/error.utils';
import { CreateShoppingListItemDto } from '../../shoppingListItem/dto/create-soppingListItem.dto';
import { CreatePantryItemDto } from '../dto/create-pantryItem.dto';
import { UpdatePantryItemDto } from '../dto/update-pantryItem.dto';
import { PantryItemTestBuilder } from '../test-utils/pantry-item-test-builders';
import {
  TEST_IDS,
  TEST_DATA,
  TEST_DATES,
} from '../../common/test-utils/test-constants';

describe('PantryItemService', () => {
  let service: PantryItemService;
  let repository: PantryItemRepository;
  let prisma: PrismaService;
  let pantryService: PantryService;

  const mockPrismaService = {
    pantryItem: {
      create: jest.fn(),
    },
    food: {
      findUnique: jest.fn(),
    },
  };

  const mockPantryItemRepository = {
    findFoodInPantry: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockPantryService = {
    validatePantryExists: jest.fn(),
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
    mockPrismaService.food.findUnique.mockResolvedValue({
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
      ],
    }).compile();

    service = module.get<PantryItemService>(PantryItemService);
    repository = module.get<PantryItemRepository>(PantryItemRepository);
    prisma = module.get<PrismaService>(PrismaService);
    pantryService = module.get<PantryService>(PantryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = TEST_IDS.USER;

    it('should create a new pantry item when valid DTO and userId are provided', async () => {
      const createDto = PantryItemTestBuilder.createCreatePantryItemDto();
      const mockPantryItem = createMockPantryItemWithRelations();
      setupSuccessfulCreateMocks();
      mockPrismaService.pantryItem.create.mockResolvedValue(mockPantryItem);

      const result = await service.create(createDto, userId);

      expect(result.id).toBe(TEST_IDS.PANTRY_ITEM);
      expect(result.quantity).toBe(TEST_DATA.QUANTITY);
      expect(result.pantryId).toBe(TEST_IDS.PANTRY);
      expect(pantryService.validatePantryExists).toHaveBeenCalledWith(
        userId,
        TEST_IDS.PANTRY,
      );
      expect(prisma.food.findUnique).toHaveBeenCalledWith({
        where: { id: TEST_IDS.FOOD },
      });
      expect(repository.findFoodInPantry).toHaveBeenCalledWith(
        TEST_IDS.PANTRY,
        TEST_IDS.FOOD,
      );
      expect(prisma.pantryItem.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when food does not exist', async () => {
      const createDto = PantryItemTestBuilder.createCreatePantryItemDto();
      mockPantryService.validatePantryExists.mockResolvedValue(TEST_IDS.PANTRY);
      mockPrismaService.food.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when food already exists in pantry', async () => {
      const createDto = PantryItemTestBuilder.createCreatePantryItemDto();
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryService.validatePantryExists.mockResolvedValue(TEST_IDS.PANTRY);
      mockPrismaService.food.findUnique.mockResolvedValue({
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
      const createDto = PantryItemTestBuilder.createCreatePantryItemDto();
      setupSuccessfulCreateMocks();
      mockPrismaService.pantryItem.create.mockRejectedValue(
        new Error('DB Error'),
      );

      await expect(service.create(createDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should transform expiryDate string to Date object when creating', async () => {
      const createDtoWithStringDate: Omit<CreatePantryItemDto, 'expiryDate'> & {
        expiryDate: string;
      } = {
        ...PantryItemTestBuilder.createCreatePantryItemDto(),
        expiryDate: '2027-02-02',
      };

      const mockPantryItem = createMockPantryItemWithRelations();
      setupSuccessfulCreateMocks();
      mockPrismaService.pantryItem.create.mockResolvedValue(mockPantryItem);

      await service.create(
        createDtoWithStringDate as unknown as CreatePantryItemDto,
        userId,
      );

      expect(prisma.pantryItem.create).toHaveBeenCalledWith({
        data: {
          quantity: TEST_DATA.QUANTITY,
          unit: Unit.KG,
          notes: TEST_DATA.NOTES,
          expiryDate: expect.any(Date),
          pantryId: TEST_IDS.PANTRY,
          foodId: TEST_IDS.FOOD,
        },
        include: {
          pantry: true,
          food: true,
        },
      });

      const createCall = (prisma.pantryItem.create as jest.Mock).mock
        .calls[0][0];
      expect(createCall.data.expiryDate).toBeInstanceOf(Date);
      expect(createCall.data.expiryDate.toISOString()).toContain('2027-02-02');
    });

    it('should handle undefined expiryDate when creating', async () => {
      const createDtoWithoutDate =
        PantryItemTestBuilder.createCreatePantryItemDto({
          expiryDate: undefined,
        });
      const mockPantryItem = createMockPantryItemWithRelations();
      setupSuccessfulCreateMocks();
      mockPrismaService.pantryItem.create.mockResolvedValue({
        ...mockPantryItem,
        expiryDate: null,
      });

      await service.create(createDtoWithoutDate, userId);

      expect(prisma.pantryItem.create).toHaveBeenCalledWith({
        data: {
          quantity: TEST_DATA.QUANTITY,
          unit: Unit.KG,
          notes: TEST_DATA.NOTES,
          expiryDate: undefined,
          pantryId: TEST_IDS.PANTRY,
          foodId: TEST_IDS.FOOD,
        },
        include: {
          pantry: true,
          food: true,
        },
      });
    });

    it('should default unit to PIECES when unit is not provided', async () => {
      const createDtoWithoutUnit =
        PantryItemTestBuilder.createCreatePantryItemDto();
      delete (createDtoWithoutUnit as any).unit;
      const mockPantryItem = createMockPantryItemWithRelations();
      setupSuccessfulCreateMocks();
      mockPrismaService.pantryItem.create.mockResolvedValue({
        ...mockPantryItem,
        unit: Unit.PIECES,
      });

      await service.create(createDtoWithoutUnit, userId);

      expect(prisma.pantryItem.create).toHaveBeenCalledWith({
        data: {
          quantity: TEST_DATA.QUANTITY,
          unit: Unit.PIECES,
          notes: TEST_DATA.NOTES,
          expiryDate: TEST_DATES.EXPIRY,
          pantryId: TEST_IDS.PANTRY,
          foodId: TEST_IDS.FOOD,
        },
        include: {
          pantry: true,
          food: true,
        },
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

      const query = PantryItemTestBuilder.createQueryPantryItemDto();
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      expect(pantryService.validatePantryExists).toHaveBeenCalledWith(
        userId,
        pantryId,
      );
      expect(repository.findMany).toHaveBeenCalledWith({
        pantryId: pantryId,
      });
    });

    it('should return filtered pantry items when foodId and unit are provided', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPrismaService.food.findUnique.mockResolvedValue({
        id: TEST_IDS.FOOD,
        name: 'Tomatoes',
      });
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemTestBuilder.createQueryPantryItemDto({
        foodId: TEST_IDS.FOOD,
        unit: Unit.KG,
      });
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      expect(pantryService.validatePantryExists).toHaveBeenCalledWith(
        userId,
        pantryId,
      );
      expect(prisma.food.findUnique).toHaveBeenCalledWith({
        where: { id: TEST_IDS.FOOD },
      });
      expect(repository.findMany).toHaveBeenCalledWith({
        pantryId: pantryId,
        foodId: TEST_IDS.FOOD,
        unit: Unit.KG,
      });
    });

    it('should throw NotFoundException when foodId is provided but food does not exist', async () => {
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPrismaService.food.findUnique.mockResolvedValue(null);

      const query = PantryItemTestBuilder.createQueryPantryItemDto({
        foodId: 'non-existent-food',
      });

      await expect(service.findAll(query, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(pantryService.validatePantryExists).toHaveBeenCalledWith(
        userId,
        pantryId,
      );
      expect(prisma.food.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-food' },
      });
      expect(repository.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array when no items are found', async () => {
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPantryItemRepository.findMany.mockResolvedValue([]);

      const query = PantryItemTestBuilder.createQueryPantryItemDto();
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(0);
    });

    it('should not filter by unit when unit is not provided', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemTestBuilder.createQueryPantryItemDto();
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      expect(repository.findMany).toHaveBeenCalledWith({
        pantryId: pantryId,
      });
    });

    it('should filter by unit when unit is explicitly provided', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemTestBuilder.createQueryPantryItemDto({
        unit: Unit.KG,
      });
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      expect(repository.findMany).toHaveBeenCalledWith({
        pantryId: pantryId,
        unit: Unit.KG,
      });
    });

    it('should filter by foodId only when foodId is provided without unit', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPrismaService.food.findUnique.mockResolvedValue({
        id: TEST_IDS.FOOD,
        name: 'Tomatoes',
      });
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemTestBuilder.createQueryPantryItemDto({
        foodId: TEST_IDS.FOOD,
      });
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      expect(repository.findMany).toHaveBeenCalledWith({
        pantryId: pantryId,
        foodId: TEST_IDS.FOOD,
      });
    });

    it('should filter by expiryDate when expiryDate is provided', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemTestBuilder.createQueryPantryItemDto({
        expiryDate: new Date('2027-12-31'),
      });
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      expect(repository.findMany).toHaveBeenCalledWith({
        pantryId: pantryId,
        expiryDate: expect.any(Date),
      });
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
        PantryItemTestBuilder.createQueryPantryItemDto({
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
      mockPrismaService.food.findUnique.mockResolvedValue({
        id: TEST_IDS.FOOD,
        name: 'Tomatoes',
      });
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemTestBuilder.createQueryPantryItemDto({
        foodId: TEST_IDS.FOOD,
        unit: Unit.KG,
        expiryDate: new Date('2027-12-31'),
      });
      const result = await service.findAll(query, userId);

      expect(result.data).toHaveLength(1);
      expect(repository.findMany).toHaveBeenCalledWith({
        pantryId: pantryId,
        foodId: TEST_IDS.FOOD,
        unit: Unit.KG,
        expiryDate: expect.any(Date),
      });
    });

    it('should not filter by expiryDate when expiryDate is not provided', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      const mockItems = [mockPantryItem];
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      mockPantryItemRepository.findMany.mockResolvedValue(mockItems);

      const query = PantryItemTestBuilder.createQueryPantryItemDto();
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
      const updateDto = PantryItemTestBuilder.createUpdatePantryItemDto();
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
      const updateDto = PantryItemTestBuilder.createUpdatePantryItemDto({
        foodId: 'food-2',
      });
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPrismaService.food.findUnique.mockResolvedValue({
        id: 'food-2',
        name: 'Carrots',
      });
      mockPantryItemRepository.update.mockResolvedValue({
        ...mockPantryItem,
        ...updateDto,
      });

      await service.update(itemId, updateDto, userId);

      expect(prisma.food.findUnique).toHaveBeenCalledWith({
        where: { id: 'food-2' },
      });
    });

    it('should throw NotFoundException when new food does not exist', async () => {
      const updateDto = PantryItemTestBuilder.createUpdatePantryItemDto({
        foodId: 'food-999',
      });
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPrismaService.food.findUnique.mockResolvedValue(null);

      await expect(service.update(itemId, updateDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when food already exists in pantry', async () => {
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPrismaService.food.findUnique.mockResolvedValue({
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

      expect(repository.update).toHaveBeenCalledWith(
        itemId,
        expect.objectContaining({
          quantity: 10,
          expiryDate: expect.any(Date),
        }),
      );

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

      expect(repository.update).toHaveBeenCalledWith(
        itemId,
        expect.objectContaining({
          quantity: 10,
        }),
      );
      const updateCall = (repository.update as jest.Mock).mock.calls[0][1];
      expect(updateCall).not.toHaveProperty('expiryDate');
    });

    it('should accept decimal quantity values', async () => {
      const updateDtoWithDecimal = {
        quantity: 100.5,
        unit: Unit.G,
      };
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPantryItemRepository.update.mockResolvedValue({
        ...mockPantryItem,
        quantity: 100.5,
        unit: Unit.G,
      });

      const result = await service.update(itemId, updateDtoWithDecimal, userId);

      expect(result.quantity).toBe(100.5);
      expect(result.unit).toBe(Unit.G);
      expect(repository.update).toHaveBeenCalledWith(
        itemId,
        expect.objectContaining({
          quantity: 100.5,
          unit: Unit.G,
        }),
      );
    });

    it('should accept small decimal quantity values (min 0.01)', async () => {
      const updateDtoWithSmallDecimal = {
        quantity: 0.5,
      };
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryItemRepository.findById.mockResolvedValue(mockPantryItem);
      mockPantryItemRepository.update.mockResolvedValue({
        ...mockPantryItem,
        quantity: 0.5,
      });

      const result = await service.update(
        itemId,
        updateDtoWithSmallDecimal,
        userId,
      );

      expect(result.quantity).toBe(0.5);
      expect(repository.update).toHaveBeenCalledWith(
        itemId,
        expect.objectContaining({
          quantity: 0.5,
        }),
      );
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
      expect(repository.update).toHaveBeenCalledWith(
        itemId,
        expect.objectContaining({
          quantity: 100,
          unit: Unit.G,
          notes: 'Buy organic if available',
          expiryDate: expect.any(Date),
        }),
      );
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

      expect(repository.delete).toHaveBeenCalledWith(itemId);
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
      const dto = new CreateShoppingListItemDto(
        TEST_IDS.FOOD,
        TEST_DATA.QUANTITY,
        Unit.KG,
      );
      const mockPantryItem = createMockPantryItemWithRelations();
      mockPantryService.validatePantryExists.mockResolvedValue(pantryId);
      setupSuccessfulCreateMocks();
      mockPrismaService.pantryItem.create.mockResolvedValue({
        ...mockPantryItem,
        id: 'new-item',
      });

      const result = await service.createFromShoppingList(
        dto,
        userId,
        pantryId,
      );

      expect(pantryService.validatePantryExists).toHaveBeenCalledWith(
        userId,
        pantryId,
      );
      expect(prisma.pantryItem.create).toHaveBeenCalledWith({
        data: {
          pantryId: pantryId,
          foodId: TEST_IDS.FOOD,
          quantity: TEST_DATA.QUANTITY,
          unit: Unit.KG,
          notes: undefined,
          expiryDate: undefined,
        },
        include: {
          pantry: true,
          food: true,
        },
      });
      expect(result.id).toBe('new-item');
    });

    it.each([
      ['', 'empty string'],
      [null, 'null'],
      [undefined, 'undefined'],
    ])(
      'should throw BadRequestException when pantryId is %s',
      async (
        invalidPantryId,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _description,
      ) => {
        const dto = new CreateShoppingListItemDto(
          TEST_IDS.FOOD,
          TEST_DATA.QUANTITY,
          Unit.KG,
        );

        await expect(
          service.createFromShoppingList(
            dto,
            userId,
            invalidPantryId as string,
          ),
        ).rejects.toThrow(BadRequestException);
      },
    );
  });
});
