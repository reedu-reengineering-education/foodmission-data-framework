import { Test, TestingModule } from '@nestjs/testing';
import { MealLogsService } from './meal-logs.service';
import { MealLogsRepository } from '../repositories/meal-logs.repository';
import { MealsRepository } from '../../meals/repositories/meals.repository';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TypeOfMeal } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
} from '../../common/exceptions/business.exception';
import {
  EventSource,
  EventType,
  MealFlagEventType,
  MealSwapEventType,
} from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';
import { MealItemRepository } from '../../meals/meal-items/repositories/meal-items.repository';
import { OffMongoProductRepository } from '../../food-products/repositories/off-mongo-product.repository';

describe('MealLogsService', () => {
  let service: MealLogsService;
  let userEventService: jest.Mocked<Pick<UserEventService, 'record'>>;
  const userId = 'user-1';

  const mockMealLogRepository = {
    create: jest.fn(),
    findWithPagination: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockMealRepository = {
    findById: jest.fn(),
  };

  const mockMealItemRepository = {
    findByMealId: jest.fn(),
  };

  const mockOffMongoProductRepository = {
    findMealFactsByBarcodes: jest.fn(),
  };

  beforeEach(async () => {
    userEventService = {
      record: jest.fn().mockResolvedValue({ event: {}, replayed: false }),
    };
    mockMealItemRepository.findByMealId.mockResolvedValue([]);
    mockOffMongoProductRepository.findMealFactsByBarcodes.mockResolvedValue(
      new Map(),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealLogsService,
        { provide: MealLogsRepository, useValue: mockMealLogRepository },
        { provide: MealsRepository, useValue: mockMealRepository },
        { provide: MealItemRepository, useValue: mockMealItemRepository },
        {
          provide: OffMongoProductRepository,
          useValue: mockOffMongoProductRepository,
        },
        { provide: UserEventService, useValue: userEventService },
      ],
    }).compile();

    service = module.get<MealLogsService>(MealLogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw when meal missing on create', async () => {
    mockMealRepository.findById.mockResolvedValue(null);

    await expect(
      service.create({ mealId: 'm1', typeOfMeal: TypeOfMeal.LUNCH }, userId),
    ).rejects.toThrow(NotFoundException);
    expect(userEventService.record).not.toHaveBeenCalled();
  });

  it('should enforce ownership on create', async () => {
    mockMealRepository.findById.mockResolvedValue({
      id: 'm1',
      userId: 'other',
    });
    await expect(
      service.create({ mealId: 'm1', typeOfMeal: TypeOfMeal.LUNCH }, userId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should create meal log when authorized', async () => {
    const loggedAt = new Date('2026-09-17T12:00:00.000Z');
    const mealLog = {
      id: 'm1',
      mealId: 'm1',
      userId,
      typeOfMeal: TypeOfMeal.LUNCH,
      eatenOut: false,
      timestamp: loggedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockMealRepository.findById.mockResolvedValue({
      id: 'm1',
      userId,
      pantryItemId: null,
    });
    mockMealLogRepository.create.mockResolvedValue(mealLog);

    const result = await service.create(
      { mealId: 'm1', typeOfMeal: TypeOfMeal.LUNCH },
      userId,
    );

    expect(result.id).toBe('m1');
    expect(mockMealLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mealId: 'm1',
        userId,
        typeOfMeal: TypeOfMeal.LUNCH,
      }),
    );
    expect(userEventService.record).toHaveBeenCalledWith({
      userId,
      eventType: EventType.MEAL_LOGGED,
      source: EventSource.MEAL_LOG,
      metadata: {
        mealLogId: 'm1',
        mealId: 'm1',
        mealDayBucket: '2026-09-17',
        source: EventSource.API,
        body: {
          mealId: 'm1',
          typeOfMeal: TypeOfMeal.LUNCH,
        },
      },
      idempotencyKey: 'meal-logged:m1',
    });
  });

  it('should forbid delete when owner differs', async () => {
    mockMealLogRepository.findById.mockResolvedValue({
      id: 'm1',
      userId: 'other',
    });

    await expect(service.remove('m1', userId)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should default mealFromPantry to false when not provided', async () => {
    const mealLog = { id: 'm1', userId, mealId: 'm1' };
    mockMealRepository.findById.mockResolvedValue({
      id: 'm1',
      userId,
    });
    mockMealLogRepository.create.mockResolvedValue(mealLog as any);

    await service.create(
      { mealId: 'm1', typeOfMeal: TypeOfMeal.BREAKFAST },
      userId,
    );

    expect(mockMealLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ mealFromPantry: false }),
    );
  });

  it('should map Prisma unique error to ResourceAlreadyExistsException on create', async () => {
    mockMealRepository.findById.mockResolvedValue({ id: 'm1', userId });
    mockMealLogRepository.create.mockRejectedValue(
      new PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: '4.0.0',
        meta: { target: ['mealId'] },
      }),
    );

    await expect(
      service.create(
        { mealId: 'm1', typeOfMeal: TypeOfMeal.BREAKFAST },
        userId,
      ),
    ).rejects.toBeInstanceOf(ResourceAlreadyExistsException);
  });

  it('should map Prisma not found error to ResourceNotFoundException on update', async () => {
    mockMealLogRepository.findById.mockResolvedValue({
      id: 'log-1',
      userId,
      mealId: 'm1',
    });
    mockMealLogRepository.update.mockRejectedValue(
      new PrismaClientKnownRequestError('missing', {
        code: 'P2025',
        clientVersion: '4.0.0',
      }),
    );

    await expect(
      service.update('log-1', { typeOfMeal: TypeOfMeal.LUNCH }, userId),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('should build filters for findAll including dates', async () => {
    const paginationResult = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };
    mockMealLogRepository.findWithPagination.mockResolvedValue(
      paginationResult,
    );

    await service.findAll(userId, {
      dateFrom: '2025-01-01T00:00:00.000Z',
      dateTo: '2025-01-31T00:00:00.000Z',
      typeOfMeal: TypeOfMeal.LUNCH,
      mealFromPantry: true,
      eatenOut: false,
      page: 2,
      limit: 5,
    });

    expect(mockMealLogRepository.findWithPagination).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
      where: {
        userId,
        typeOfMeal: TypeOfMeal.LUNCH,
        mealFromPantry: true,
        eatenOut: false,
        timestamp: {
          gte: new Date('2025-01-01T00:00:00.000Z'),
          lte: new Date('2025-01-31T00:00:00.000Z'),
        },
      },
      orderBy: { timestamp: 'desc' },
      include: { meal: true },
    });
  });

  describe('quick logs (flags instead of a meal)', () => {
    const quickLog = (
      flags: MealFlagEventType[],
      swaps: MealSwapEventType[] = [],
    ) => ({
      id: 'log-1',
      mealId: null,
      userId,
      typeOfMeal: TypeOfMeal.LUNCH,
      timestamp: new Date('2026-09-17T12:00:00.000Z'),
      mealFromPantry: false,
      eatenOut: false,
      flags,
      swaps,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const recordedTypes = () =>
      userEventService.record.mock.calls.map((call) => call[0].eventType);

    it('rejects a log with neither mealId nor flags', async () => {
      await expect(
        service.create({ typeOfMeal: TypeOfMeal.LUNCH }, userId),
      ).rejects.toThrow(BadRequestException);
      expect(mockMealLogRepository.create).not.toHaveBeenCalled();
      expect(userEventService.record).not.toHaveBeenCalled();
    });

    it('rejects MEAT combined with a meat-free flag', async () => {
      await expect(
        service.create(
          {
            typeOfMeal: TypeOfMeal.LUNCH,
            flags: [EventType.MEAL_MEAT_CONSUMED, EventType.MEAL_VEGAN],
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockMealLogRepository.create).not.toHaveBeenCalled();
    });

    it('records one event per flag and swap, deduped', async () => {
      const log = quickLog(
        [
          EventType.MEAL_VEGAN,
          EventType.MEAL_MEAT_FREE,
          EventType.MEAL_LEGUME_CONSUMED,
        ],
        [EventType.SWAP_BEEF_TO_LEGUMES],
      );
      mockMealLogRepository.create.mockResolvedValue(log);

      await service.create(
        {
          typeOfMeal: TypeOfMeal.LUNCH,
          flags: [
            EventType.MEAL_VEGAN,
            EventType.MEAL_MEAT_FREE,
            EventType.MEAL_LEGUME_CONSUMED,
          ],
          swaps: [EventType.SWAP_BEEF_TO_LEGUMES],
        },
        userId,
      );

      expect(mockMealRepository.findById).not.toHaveBeenCalled();
      // MEAL_MEAT_FREE is implied by both VEGAN and VEGETARIAN — recorded once.
      expect(recordedTypes()).toEqual([
        EventType.MEAL_LOGGED,
        EventType.MEAL_VEGAN,
        EventType.MEAL_MEAT_FREE,
        EventType.MEAL_LEGUME_CONSUMED,
        EventType.SWAP_BEEF_TO_LEGUMES,
      ]);

      const swapCall = userEventService.record.mock.calls.find(
        (call) => call[0].eventType === EventType.SWAP_BEEF_TO_LEGUMES,
      );
      expect(swapCall?.[0]).toEqual(
        expect.objectContaining({
          source: EventSource.MEAL_LOG,
          idempotencyKey: 'SWAP_BEEF_TO_LEGUMES:log-1',
          metadata: expect.objectContaining({ from: 'BEEF', to: 'LEGUMES' }),
        }),
      );
    });

    it('stamps flag and swap events with the meal day, not the recording day', async () => {
      const log = quickLog(
        [EventType.MEAL_MEAT_CONSUMED],
        [EventType.SWAP_BEEF_TO_CHICKEN],
      );
      mockMealLogRepository.create.mockResolvedValue(log);

      await service.create(
        {
          typeOfMeal: TypeOfMeal.LUNCH,
          flags: [EventType.MEAL_MEAT_CONSUMED],
          swaps: [EventType.SWAP_BEEF_TO_CHICKEN],
        },
        userId,
      );

      for (const [input] of userEventService.record.mock.calls) {
        expect(input.metadata).toEqual(
          expect.objectContaining({ mealDayBucket: '2026-09-17' }),
        );
      }
    });

    it('still returns the log when recording an event fails', async () => {
      const log = quickLog([EventType.MEAL_MEAT_CONSUMED]);
      mockMealLogRepository.create.mockResolvedValue(log);
      userEventService.record.mockRejectedValue(new Error('ledger down'));

      const result = await service.create(
        { typeOfMeal: TypeOfMeal.LUNCH, flags: [EventType.MEAL_MEAT_CONSUMED] },
        userId,
      );

      expect(result.id).toBe('log-1');
    });
  });
  describe('flags derived from the meal items', () => {
    const lentils = {
      genericFood: {
        nevoCode: 120,
        vegan: true,
        vegetarian: true,
        meatOrFish: false,
        legume: true,
      },
      foodProduct: null,
    };
    const importedProduct = {
      genericFood: null,
      foodProduct: {
        barcode: '5000',
        categories: [],
        labels: [],
        ingredientsAnalysisTags: [],
        isVegan: true,
        isVegetarian: true,
      },
    };
    const chicken = {
      genericFood: {
        nevoCode: 300,
        vegan: false,
        vegetarian: false,
        meatOrFish: true,
        legume: false,
      },
      foodProduct: null,
    };

    const mealLog = (flags: MealFlagEventType[]) => ({
      id: 'log-1',
      mealId: 'meal-1',
      userId,
      typeOfMeal: TypeOfMeal.DINNER,
      timestamp: new Date('2026-09-17T19:00:00.000Z'),
      mealFromPantry: false,
      eatenOut: false,
      flags,
      swaps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const flagEvents = () =>
      userEventService.record.mock.calls
        .map(([input]) => input)
        .filter((input) => input.eventType !== EventType.MEAL_LOGGED);

    beforeEach(() => {
      mockMealRepository.findById.mockResolvedValue({ id: 'meal-1', userId });
      mockMealLogRepository.create.mockImplementation(
        (data: { flags: MealFlagEventType[] }) =>
          Promise.resolve(mealLog(data.flags)),
      );
    });

    it('stores and records derived flags with their source', async () => {
      mockMealItemRepository.findByMealId.mockResolvedValue([lentils]);

      await service.create(
        { mealId: 'meal-1', typeOfMeal: TypeOfMeal.DINNER },
        userId,
      );

      expect(mockMealItemRepository.findByMealId).toHaveBeenCalledWith(
        'meal-1',
      );
      expect(mockMealLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: [
            EventType.MEAL_MEAT_FREE,
            EventType.MEAL_VEGAN,
            EventType.MEAL_LEGUME_CONSUMED,
          ],
        }),
      );
      expect(
        flagEvents().map((input) => [
          input.eventType,
          input.metadata?.flagSource,
        ]),
      ).toEqual([
        [EventType.MEAL_MEAT_FREE, 'derived'],
        [EventType.MEAL_VEGAN, 'derived'],
        [EventType.MEAL_LEGUME_CONSUMED, 'derived'],
      ]);
    });

    it('keeps the client flag and drops a contradicting derived one', async () => {
      mockMealItemRepository.findByMealId.mockResolvedValue([chicken]);

      await service.create(
        {
          mealId: 'meal-1',
          typeOfMeal: TypeOfMeal.DINNER,
          flags: [EventType.MEAL_MEAT_FREE],
        },
        userId,
      );

      expect(flagEvents().map((input) => input.eventType)).toEqual([
        EventType.MEAL_MEAT_FREE,
      ]);
      expect(flagEvents()[0].metadata?.flagSource).toBe('user');
    });

    it('marks a flag sent by the client and derived from the items as both', async () => {
      mockMealItemRepository.findByMealId.mockResolvedValue([lentils]);

      await service.create(
        {
          mealId: 'meal-1',
          typeOfMeal: TypeOfMeal.DINNER,
          flags: [EventType.MEAL_LEGUME_CONSUMED],
        },
        userId,
      );

      const legume = flagEvents().find(
        (input) => input.eventType === EventType.MEAL_LEGUME_CONSUMED,
      );
      expect(legume?.metadata?.flagSource).toBe('both');
    });

    it('reads OFF tags from Mongo for products whose stored tags are empty', async () => {
      mockMealItemRepository.findByMealId.mockResolvedValue([importedProduct]);
      mockOffMongoProductRepository.findMealFactsByBarcodes.mockResolvedValue(
        new Map([
          [
            '5000',
            {
              categories: ['en:legumes', 'en:chickpeas'],
              labels: ['en:eu-organic'],
              ingredientsAnalysisTags: ['en:vegan', 'en:vegetarian'],
            },
          ],
        ]),
      );

      await service.create(
        { mealId: 'meal-1', typeOfMeal: TypeOfMeal.DINNER },
        userId,
      );

      expect(
        mockOffMongoProductRepository.findMealFactsByBarcodes,
      ).toHaveBeenCalledWith(['5000']);
      expect(flagEvents().map((input) => input.eventType)).toEqual(
        expect.arrayContaining([
          EventType.MEAL_LEGUME_CONSUMED,
          EventType.MEAL_CERTIFIED_PRODUCT,
        ]),
      );
    });

    it('uses the stored product fields when Mongo has no data', async () => {
      mockMealItemRepository.findByMealId.mockResolvedValue([importedProduct]);

      await service.create(
        { mealId: 'meal-1', typeOfMeal: TypeOfMeal.DINNER },
        userId,
      );

      expect(flagEvents().map((input) => input.eventType)).toEqual([
        EventType.MEAL_MEAT_FREE,
        EventType.MEAL_VEGAN,
      ]);
    });

    it('still creates the log when loading the items fails', async () => {
      mockMealItemRepository.findByMealId.mockRejectedValue(new Error('db'));

      const result = await service.create(
        { mealId: 'meal-1', typeOfMeal: TypeOfMeal.DINNER },
        userId,
      );

      expect(result.id).toBe('log-1');
      expect(flagEvents()).toEqual([]);
    });

    it('does not look up items for a quick log', async () => {
      mockMealLogRepository.create.mockResolvedValue({
        ...mealLog([EventType.MEAL_VEGAN]),
        mealId: null,
      });

      await service.create(
        { typeOfMeal: TypeOfMeal.LUNCH, flags: [EventType.MEAL_VEGAN] },
        userId,
      );

      expect(mockMealItemRepository.findByMealId).not.toHaveBeenCalled();
      expect(
        flagEvents().every((input) => input.metadata?.flagSource === 'user'),
      ).toBe(true);
    });
  });
});
