import { Test, TestingModule } from '@nestjs/testing';
import { MealLogsService } from './meal-logs.service';
import { MealLogsRepository } from '../repositories/meal-logs.repository';
import { MealsRepository } from '../../meals/repositories/meals.repository';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MealLogStatus, TypeOfMeal } from '@prisma/client';
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
import { ProgressWheelService } from '../../gamification/services/progress-wheel.service';

describe('MealLogsService', () => {
  let service: MealLogsService;
  let userEventService: jest.Mocked<Pick<UserEventService, 'record'>>;
  let progressWheelService: { recordImpact: jest.Mock };
  const userId = 'user-1';

  const mockMealLogRepository = {
    create: jest.fn(),
    findWithPagination: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    confirmDraft: jest.fn(),
  };

  const mockMealRepository = {
    findById: jest.fn(),
  };

  const mockMealItemRepository = {
    findByMealId: jest.fn(),
    findRecipeIngredientFoodsByMealId: jest.fn(),
  };

  const mockOffMongoProductRepository = {
    findMealFactsByBarcodes: jest.fn(),
  };

  beforeEach(async () => {
    userEventService = {
      record: jest.fn().mockResolvedValue({ event: {}, replayed: false }),
    };
    progressWheelService = { recordImpact: jest.fn().mockResolvedValue({}) };
    mockMealItemRepository.findByMealId.mockResolvedValue([]);
    mockMealItemRepository.findRecipeIngredientFoodsByMealId.mockResolvedValue(
      [],
    );
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
        { provide: ProgressWheelService, useValue: progressWheelService },
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
      createdAt: loggedAt,
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
        status: MealLogStatus.CONFIRMED,
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

    it('rejects a log with neither mealId, flags nor swaps', async () => {
      await expect(
        service.create({ typeOfMeal: TypeOfMeal.LUNCH }, userId),
      ).rejects.toThrow(BadRequestException);
      expect(mockMealLogRepository.create).not.toHaveBeenCalled();
      expect(userEventService.record).not.toHaveBeenCalled();
    });

    it('accepts a quick log with only a swap', async () => {
      const log = quickLog([], [EventType.SWAP_BEEF_TO_LEGUMES]);
      mockMealLogRepository.create.mockResolvedValue(log);

      await service.create(
        {
          typeOfMeal: TypeOfMeal.LUNCH,
          swaps: [EventType.SWAP_BEEF_TO_LEGUMES],
        },
        userId,
      );

      expect(mockMealLogRepository.create).toHaveBeenCalled();
      expect(recordedTypes()).toEqual([
        EventType.MEAL_LOGGED,
        EventType.SWAP_BEEF_TO_LEGUMES,
      ]);
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

    it('dates flag and swap events at the meal, not the recording time', async () => {
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
        expect(input.createdAt).toEqual(log.timestamp);
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

    it('moves the wheels once per reported action', async () => {
      const flags = [
        EventType.MEAL_VEGAN,
        EventType.MEAL_MEAT_FREE,
        EventType.FOOD_WASTE_HALF_PLATE_SAVED,
      ];
      const swaps = [EventType.SWAP_SUGARY_DRINK_TO_WATER];
      mockMealLogRepository.create.mockResolvedValue(quickLog(flags, swaps));

      await service.create(
        { typeOfMeal: TypeOfMeal.LUNCH, flags, swaps },
        userId,
      );

      expect(
        progressWheelService.recordImpact.mock.calls.map((call) => call[1]),
      ).toEqual([
        'VEGAN_MEAL',
        'HALF_PLATE_SAVED',
        'SUGARY_DRINK_TO_WATER_250ML',
      ]);
      expect(progressWheelService.recordImpact).toHaveBeenCalledWith(
        userId,
        'VEGAN_MEAL',
        {
          source: EventSource.MEAL_LOG,
          subject: { type: 'MEAL_LOG', id: 'log-1' },
        },
      );
    });

    it('still returns the log when a wheel update fails', async () => {
      const swaps = [
        EventType.SWAP_BEEF_TO_PORK,
        EventType.SWAP_PORK_TO_CHICKEN,
      ];
      mockMealLogRepository.create.mockResolvedValue(quickLog([], swaps));
      progressWheelService.recordImpact.mockRejectedValueOnce(
        new Error('db down'),
      );

      const result = await service.create(
        { typeOfMeal: TypeOfMeal.LUNCH, swaps },
        userId,
      );

      expect(result.id).toBe('log-1');
      // One failure doesn't stop the remaining actions.
      expect(progressWheelService.recordImpact).toHaveBeenCalledTimes(2);
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

    describe('meals based on a recipe', () => {
      const derivedFlags = () =>
        mockMealLogRepository.create.mock.calls[0][0].flags;

      it('derives from the recipe ingredients when the meal has no items', async () => {
        mockMealItemRepository.findByMealId.mockResolvedValue([]);
        mockMealItemRepository.findRecipeIngredientFoodsByMealId.mockResolvedValue(
          [lentils],
        );

        await service.create(
          { mealId: 'meal-1', typeOfMeal: TypeOfMeal.DINNER },
          userId,
        );

        expect(
          mockMealItemRepository.findRecipeIngredientFoodsByMealId,
        ).toHaveBeenCalledWith('meal-1');
        expect(derivedFlags()).toEqual([
          EventType.MEAL_MEAT_FREE,
          EventType.MEAL_VEGAN,
          EventType.MEAL_LEGUME_CONSUMED,
        ]);
      });

      it('combines meal items and recipe ingredients', async () => {
        // Vegan items, but the recipe has chicken.
        mockMealItemRepository.findByMealId.mockResolvedValue([lentils]);
        mockMealItemRepository.findRecipeIngredientFoodsByMealId.mockResolvedValue(
          [chicken],
        );

        await service.create(
          { mealId: 'meal-1', typeOfMeal: TypeOfMeal.DINNER },
          userId,
        );

        expect(derivedFlags()).toEqual([
          EventType.MEAL_MEAT_CONSUMED,
          EventType.MEAL_LEGUME_CONSUMED,
        ]);
      });

      it('treats an unlinked ingredient as unknown', async () => {
        mockMealItemRepository.findByMealId.mockResolvedValue([]);
        mockMealItemRepository.findRecipeIngredientFoodsByMealId.mockResolvedValue(
          [lentils, { genericFood: null, foodProduct: null }],
        );

        await service.create(
          { mealId: 'meal-1', typeOfMeal: TypeOfMeal.DINNER },
          userId,
        );

        // Legume still counts; vegan / meat-free can't be claimed.
        expect(derivedFlags()).toEqual([EventType.MEAL_LEGUME_CONSUMED]);
      });
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

  describe('staged meal logs', () => {
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

    const draftLog = (overrides: Record<string, unknown> = {}) => ({
      id: 'log-1',
      mealId: 'meal-1',
      userId,
      typeOfMeal: TypeOfMeal.DINNER,
      timestamp: new Date('2026-09-17T19:00:00.000Z'),
      mealFromPantry: false,
      eatenOut: false,
      flags: [
        EventType.MEAL_VEGAN,
        EventType.MEAL_MEAT_FREE,
        EventType.MEAL_LEGUME_CONSUMED,
      ],
      swaps: [],
      status: MealLogStatus.DRAFT,
      derivedFlags: [
        EventType.MEAL_MEAT_FREE,
        EventType.MEAL_VEGAN,
        EventType.MEAL_LEGUME_CONSUMED,
      ],
      confirmedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    const recorded = () =>
      userEventService.record.mock.calls.map(([input]) => input);

    beforeEach(() => {
      mockMealRepository.findById.mockResolvedValue({ id: 'meal-1', userId });
    });

    it('stores a draft with its derived flags and records nothing', async () => {
      mockMealItemRepository.findByMealId.mockResolvedValue([lentils]);
      mockMealLogRepository.create.mockImplementation((data) =>
        Promise.resolve({ ...draftLog(), ...data }),
      );

      const result = await service.create(
        { mealId: 'meal-1', typeOfMeal: TypeOfMeal.DINNER, draft: true },
        userId,
      );

      const data = mockMealLogRepository.create.mock.calls[0][0];
      expect(data).toMatchObject({
        status: MealLogStatus.DRAFT,
        flags: expect.arrayContaining([
          EventType.MEAL_VEGAN,
          EventType.MEAL_LEGUME_CONSUMED,
        ]),
        derivedFlags: expect.arrayContaining([
          EventType.MEAL_VEGAN,
          EventType.MEAL_LEGUME_CONSUMED,
        ]),
      });
      expect(data).not.toHaveProperty('draft');
      expect(result.status).toBe(MealLogStatus.DRAFT);
      expect(userEventService.record).not.toHaveBeenCalled();
      expect(progressWheelService.recordImpact).not.toHaveBeenCalled();
    });

    it('creates CONFIRMED and records events without draft', async () => {
      mockMealLogRepository.create.mockImplementation((data) =>
        Promise.resolve({ ...draftLog(), ...data }),
      );

      await service.create(
        { mealId: 'meal-1', typeOfMeal: TypeOfMeal.DINNER },
        userId,
      );

      expect(mockMealLogRepository.create.mock.calls[0][0].status).toBe(
        MealLogStatus.CONFIRMED,
      );
      expect(userEventService.record).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: EventType.MEAL_LOGGED }),
      );
    });

    describe('confirm', () => {
      it('records the reviewed flags with both/user sources, dated at the meal', async () => {
        const draft = draftLog();
        mockMealLogRepository.findById
          .mockResolvedValueOnce(draft)
          .mockResolvedValueOnce({
            ...draft,
            flags: [
              EventType.MEAL_LEGUME_CONSUMED,
              EventType.MEAL_LOCAL_PRODUCE,
            ],
            status: MealLogStatus.CONFIRMED,
          });
        mockMealLogRepository.confirmDraft.mockResolvedValue(true);

        // The user drops the vegan proposal and adds local produce.
        const result = await service.confirm(
          'log-1',
          {
            flags: [
              EventType.MEAL_LEGUME_CONSUMED,
              EventType.MEAL_LOCAL_PRODUCE,
            ],
          },
          userId,
        );

        expect(mockMealLogRepository.confirmDraft).toHaveBeenCalledWith(
          'log-1',
          expect.any(Date),
          {
            flags: [
              EventType.MEAL_LEGUME_CONSUMED,
              EventType.MEAL_LOCAL_PRODUCE,
            ],
            swaps: [],
          },
        );
        expect(result.status).toBe(MealLogStatus.CONFIRMED);

        const events = recorded();
        expect(events.map((e) => e.eventType).sort()).toEqual(
          [
            EventType.MEAL_LOGGED,
            EventType.MEAL_LEGUME_CONSUMED,
            EventType.MEAL_LOCAL_PRODUCE,
          ].sort(),
        );
        const source = (type: string) =>
          (
            events.find((e) => e.eventType === type)?.metadata as {
              flagSource?: string;
            }
          )?.flagSource;
        expect(source(EventType.MEAL_LEGUME_CONSUMED)).toBe('both');
        expect(source(EventType.MEAL_LOCAL_PRODUCE)).toBe('user');
        for (const event of events) {
          expect(event.createdAt).toEqual(draft.timestamp);
        }
        expect(
          events.find((e) => e.eventType === EventType.MEAL_LOGGED)?.metadata,
        ).toMatchObject({ body: { reviewed: true } });
      });

      it('keeps the draft flags when none are given', async () => {
        const draft = draftLog();
        mockMealLogRepository.findById.mockResolvedValue(draft);
        mockMealLogRepository.confirmDraft.mockResolvedValue(true);

        await service.confirm('log-1', {}, userId);

        expect(mockMealLogRepository.confirmDraft).toHaveBeenCalledWith(
          'log-1',
          expect.any(Date),
          { flags: draft.flags, swaps: [] },
        );
      });

      it('records nothing when a concurrent confirm won', async () => {
        mockMealLogRepository.findById.mockResolvedValue(draftLog());
        mockMealLogRepository.confirmDraft.mockResolvedValue(false);

        await service.confirm('log-1', {}, userId);

        expect(userEventService.record).not.toHaveBeenCalled();
        expect(progressWheelService.recordImpact).not.toHaveBeenCalled();
      });

      it('returns a confirmed log unchanged', async () => {
        mockMealLogRepository.findById.mockResolvedValue(
          draftLog({ status: MealLogStatus.CONFIRMED }),
        );

        const result = await service.confirm('log-1', {}, userId);

        expect(result.status).toBe(MealLogStatus.CONFIRMED);
        expect(mockMealLogRepository.confirmDraft).not.toHaveBeenCalled();
        expect(userEventService.record).not.toHaveBeenCalled();
      });

      it('rejects conflicting or empty final facts', async () => {
        mockMealLogRepository.findById.mockResolvedValue(
          draftLog({ mealId: null }),
        );

        await expect(
          service.confirm(
            'log-1',
            { flags: [EventType.MEAL_MEAT_CONSUMED, EventType.MEAL_VEGAN] },
            userId,
          ),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.confirm('log-1', { flags: [], swaps: [] }, userId),
        ).rejects.toThrow(BadRequestException);
        expect(mockMealLogRepository.confirmDraft).not.toHaveBeenCalled();
      });
    });

    describe('update', () => {
      it('changes the flags of a draft', async () => {
        mockMealLogRepository.findById.mockResolvedValue(draftLog());
        mockMealLogRepository.update.mockImplementation((_id, data) =>
          Promise.resolve({ ...draftLog(), ...data }),
        );

        await service.update(
          'log-1',
          { flags: [EventType.MEAL_LEGUME_CONSUMED] },
          userId,
        );

        expect(mockMealLogRepository.update).toHaveBeenCalledWith(
          'log-1',
          expect.objectContaining({
            flags: [EventType.MEAL_LEGUME_CONSUMED],
          }),
        );
        expect(userEventService.record).not.toHaveBeenCalled();
      });

      it('rejects flag changes on a confirmed log', async () => {
        mockMealLogRepository.findById.mockResolvedValue(
          draftLog({ status: MealLogStatus.CONFIRMED }),
        );

        await expect(
          service.update(
            'log-1',
            { flags: [EventType.MEAL_LEGUME_CONSUMED] },
            userId,
          ),
        ).rejects.toThrow(BadRequestException);
        expect(mockMealLogRepository.update).not.toHaveBeenCalled();
      });

      it('derives again when a draft gets another meal, keeping user additions', async () => {
        mockMealLogRepository.findById.mockResolvedValue(
          draftLog({
            flags: [
              EventType.MEAL_VEGAN,
              EventType.MEAL_MEAT_FREE,
              EventType.MEAL_LEGUME_CONSUMED,
              EventType.MEAL_LOCAL_PRODUCE,
            ],
          }),
        );
        mockMealItemRepository.findByMealId.mockResolvedValue([chicken]);
        mockMealLogRepository.update.mockImplementation((_id, data) =>
          Promise.resolve({ ...draftLog(), ...data }),
        );

        await service.update('log-1', { mealId: 'meal-2' }, userId);

        const data = mockMealLogRepository.update.mock.calls[0][1];
        expect(data.derivedFlags).toEqual([EventType.MEAL_MEAT_CONSUMED]);
        expect([...data.flags].sort()).toEqual(
          [EventType.MEAL_LOCAL_PRODUCE, EventType.MEAL_MEAT_CONSUMED].sort(),
        );
      });
    });

    describe("findOne refreshes a draft's proposals", () => {
      it('updates flags when the meal items changed', async () => {
        mockMealLogRepository.findById.mockResolvedValue(
          draftLog({
            flags: [
              EventType.MEAL_VEGAN,
              EventType.MEAL_LEGUME_CONSUMED,
              EventType.MEAL_LOCAL_PRODUCE,
            ],
            derivedFlags: [
              EventType.MEAL_VEGAN,
              EventType.MEAL_LEGUME_CONSUMED,
            ],
          }),
        );
        mockMealItemRepository.findByMealId.mockResolvedValue([
          lentils,
          chicken,
        ]);
        mockMealLogRepository.update.mockImplementation((_id, data) =>
          Promise.resolve({ ...draftLog(), ...data }),
        );

        const result = await service.findOne('log-1', userId);

        const data = mockMealLogRepository.update.mock.calls[0][1];
        expect([...data.derivedFlags].sort()).toEqual(
          [EventType.MEAL_MEAT_CONSUMED, EventType.MEAL_LEGUME_CONSUMED].sort(),
        );
        expect([...data.flags].sort()).toEqual(
          [
            EventType.MEAL_LEGUME_CONSUMED,
            EventType.MEAL_LOCAL_PRODUCE,
            EventType.MEAL_MEAT_CONSUMED,
          ].sort(),
        );
        expect(result.flags).toEqual(data.flags);
        expect(userEventService.record).not.toHaveBeenCalled();
      });

      it('does not write when nothing changed', async () => {
        mockMealLogRepository.findById.mockResolvedValue(draftLog());
        mockMealItemRepository.findByMealId.mockResolvedValue([lentils]);

        await service.findOne('log-1', userId);

        expect(mockMealLogRepository.update).not.toHaveBeenCalled();
      });

      it('keeps the stored draft when deriving fails', async () => {
        mockMealLogRepository.findById.mockResolvedValue(draftLog());
        mockMealItemRepository.findByMealId.mockRejectedValue(
          new Error('db down'),
        );

        const result = await service.findOne('log-1', userId);

        expect(mockMealLogRepository.update).not.toHaveBeenCalled();
        expect(result.flags).toEqual(draftLog().flags);
      });

      it('leaves confirmed logs alone', async () => {
        mockMealLogRepository.findById.mockResolvedValue(
          draftLog({ status: MealLogStatus.CONFIRMED }),
        );

        await service.findOne('log-1', userId);

        expect(mockMealItemRepository.findByMealId).not.toHaveBeenCalled();
      });
    });

    it('lists drafts only when asked for', async () => {
      mockMealLogRepository.findWithPagination.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await service.findAll(userId, {
        status: MealLogStatus.DRAFT,
        page: 1,
        limit: 10,
      });

      expect(
        mockMealLogRepository.findWithPagination.mock.calls[0][0].where,
      ).toMatchObject({ status: MealLogStatus.DRAFT });
    });
  });
});
