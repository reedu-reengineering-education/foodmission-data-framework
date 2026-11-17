import { Test, TestingModule } from '@nestjs/testing';
import {
  buildMinimalRecipeIngredientFoodProduct,
  STUB_GENERIC_FOOD_CHICKEN_NEVO,
} from '../../../test/fixtures/food-ref.fixtures';
import { RecipesService } from './recipes.service';
import { RecipesRepository } from '../repositories/recipes.repository';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecipeOrigin } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
} from '../../common/exceptions/business.exception';
import {
  buildRecipe,
  buildRecipeIngredient,
  emptyPaginationMock,
} from '../../../test/fixtures/recipe.fixtures';
import { UserEventService } from '../../events/services/user-event.service';
import { TranslationService } from '../../translations/services/translation.service';
import { GenericFoodRepository } from '../../generic-foods/repositories/generic-food.repository';

describe('RecipesService', () => {
  let service: RecipesService;
  const userId = 'user-1';

  const mockRecipeRepository = {
    create: jest.fn(),
    findWithPagination: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findRating: jest.fn(),
    upsertRating: jest.fn(),
    deleteRating: jest.fn(),
    findEstimateIngredients: jest.fn().mockResolvedValue([]),
    findCuratedGenericFoodIds: jest.fn().mockResolvedValue(new Map()),
    updateEstimates: jest.fn().mockResolvedValue(undefined),
  };

  const mockGenericFoodRepository = {
    findSearchCandidates: jest.fn().mockResolvedValue([]),
  };

  const mockPrisma = {
    entityTranslation: { findMany: jest.fn().mockResolvedValue([]) },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        {
          // The badge rules count SURVEY_COMPLETED / SHOPPING_LIST_CREATED /
          // LEARNING_RECIPE_EXPLORED / USER_REGISTERED; recording is
          // best-effort in the service, so the stub only has to exist.
          provide: UserEventService,
          useValue: {
            record: jest.fn().mockResolvedValue({
              event: { id: 'evt-1' },
              replayed: false,
            }),
            recordBestEffort: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: RecipesRepository, useValue: mockRecipeRepository },
        {
          provide: TranslationService,
          useValue: new TranslationService(mockPrisma as any),
        },
        { provide: GenericFoodRepository, useValue: mockGenericFoodRepository },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create recipe for user', async () => {
    const recipe = buildRecipe({ id: 'r1', userId, title: 'Test Recipe' });
    mockRecipeRepository.create.mockResolvedValue(recipe);

    const result = await service.create({ title: 'Test Recipe' }, userId);

    expect(result.id).toBe('r1');
    expect(mockRecipeRepository.create).toHaveBeenCalledWith({
      title: 'Test Recipe',
      userId,
      allergens: [],
      isPublic: false,
      origin: RecipeOrigin.USER,
    });
  });

  describe('linking ingredients to generic foods', () => {
    const candidate = (id: string, foodName: string) => ({
      id,
      nevoCode: 1,
      foodName,
      synonym: null,
      foodGroup: 'Cereal products',
      foodex2Codes: [],
      translatedNames: [],
      substringMatch: true,
    });
    const createdIngredients = () =>
      mockRecipeRepository.create.mock.calls[0][0].ingredients;

    beforeEach(() => {
      mockRecipeRepository.create.mockResolvedValue(
        buildRecipe({ id: 'r1', userId }),
      );
    });

    it('uses the food the seeded recipes link that name to', async () => {
      mockRecipeRepository.findCuratedGenericFoodIds.mockResolvedValueOnce(
        new Map([['olive oil', 'oil-olive']]),
      );

      await service.create(
        { title: 'Salad', ingredients: [{ name: ' Olive Oil ' }] },
        userId,
      );

      expect(
        mockRecipeRepository.findCuratedGenericFoodIds,
      ).toHaveBeenCalledWith(['Olive Oil']);
      expect(createdIngredients()).toEqual([
        { name: ' Olive Oil ', genericFoodId: 'oil-olive' },
      ]);
    });

    it('falls back to a generic food whose name starts with the ingredient name', async () => {
      mockGenericFoodRepository.findSearchCandidates.mockResolvedValueOnce([
        candidate('pasta-white', 'Pasta white raw'),
      ]);

      await service.create(
        { title: 'Pasta', ingredients: [{ name: 'Pasta' }] },
        userId,
      );

      expect(createdIngredients()).toEqual([
        { name: 'Pasta', genericFoodId: 'pasta-white' },
      ]);
    });

    it('does not link a food that only shares the start of a word', async () => {
      mockGenericFoodRepository.findSearchCandidates.mockResolvedValueOnce([
        candidate('buttermilk', 'Buttermilk'),
      ]);

      await service.create(
        { title: 'Toast', ingredients: [{ name: 'Butter' }] },
        userId,
      );

      expect(createdIngredients()).toEqual([{ name: 'Butter' }]);
    });

    it('keeps a food the user linked', async () => {
      await service.create(
        {
          title: 'Toast',
          ingredients: [{ name: 'Butter', genericFoodId: 'chosen' }],
        },
        userId,
      );

      expect(
        mockRecipeRepository.findCuratedGenericFoodIds,
      ).not.toHaveBeenCalled();
      expect(createdIngredients()).toEqual([
        { name: 'Butter', genericFoodId: 'chosen' },
      ]);
    });
  });

  describe('estimates', () => {
    const estimate = {
      per100g: { energyKcal: 130 },
      estimated: true,
      missingIngredients: [],
    };

    const withIngredients = { ingredients: [{ name: 'Chicken' }] };

    const storedFields = () =>
      mockRecipeRepository.updateEstimates.mock.calls.map(([, fields]) =>
        Object.keys(fields).sort(),
      );

    beforeEach(() => {
      mockRecipeRepository.create.mockResolvedValue(
        buildRecipe({ id: 'r1', userId }),
      );
    });

    it('estimates nutrition and environmental impact for a new recipe, stores and returns them', async () => {
      mockRecipeRepository.findEstimateIngredients.mockResolvedValueOnce([
        {
          name: 'Chicken',
          measure: '200g',
          quantity: 200,
          unit: 'G',
          foodProduct: null,
          genericFood: {
            foodName: 'Chicken fillet cooked',
            energyKcal: 130,
            agribalyseFood: {
              co2PerKg: 5.58,
              efScorePerKg: 0.5,
              dqr: 2.1,
              version: '3.2',
            },
          },
        },
      ]);
      const environmentalImpact = {
        perKg: { co2: 5.58, efScoreMpt: 0.5 },
        coverage: 1,
        dqr: 2.1,
        source: 'AGRIBALYSE 3.2',
      };

      const result = await service.create(
        { title: 'Test Recipe', ...withIngredients },
        userId,
      );

      expect(mockRecipeRepository.updateEstimates).toHaveBeenCalledWith('r1', {
        nutritionalInfo: estimate,
        environmentalImpact,
      });
      expect(result.nutritionalInfo).toEqual(estimate);
      expect(result.environmentalImpact).toEqual(environmentalImpact);
    });

    it('stores neither when the ingredients cannot be weighed', async () => {
      await service.create(
        { title: 'Test Recipe', ...withIngredients },
        userId,
      );

      expect(mockRecipeRepository.updateEstimates).toHaveBeenCalledWith('r1', {
        nutritionalInfo: null,
        environmentalImpact: null,
      });
    });

    it('still returns the new recipe when the estimate fails', async () => {
      mockRecipeRepository.updateEstimates.mockRejectedValueOnce(
        new Error('database unavailable'),
      );

      const result = await service.create(
        { title: 'Test Recipe', ...withIngredients },
        userId,
      );

      expect(result.id).toBe('r1');
    });

    it.each([
      ['without ingredients', {}, []],
      [
        'with null nutrition',
        { ...withIngredients, nutritionalInfo: null },
        ['environmentalImpact', 'nutritionalInfo'],
      ],
      [
        'with nutrition from the user',
        { ...withIngredients, nutritionalInfo: { energyKcal: 300 } },
        ['environmentalImpact'],
      ],
    ])('on create %s', async (_, dto, expectedFields) => {
      await service.create({ title: 'Test Recipe', ...dto }, userId);

      expect(storedFields()).toEqual(
        expectedFields.length ? [expectedFields] : [],
      );
    });

    it('stores null nutrition from the user as not sent', async () => {
      await service.create(
        { title: 'Test Recipe', ...withIngredients, nutritionalInfo: null },
        userId,
      );

      expect(mockRecipeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ nutritionalInfo: undefined }),
      );
    });

    it('marks nutrition the user sends as entered, whatever flag they send', async () => {
      await service.create(
        {
          title: 'Test Recipe',
          nutritionalInfo: { energyKcal: 300, estimated: true },
        },
        userId,
      );

      expect(mockRecipeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nutritionalInfo: { energyKcal: 300, estimated: false },
        }),
      );
    });

    it.each([
      [
        'ingredients change',
        { ingredients: [{ name: 'Rice' }] },
        estimate,
        ['environmentalImpact', 'nutritionalInfo'],
      ],
      ['only servings change', { servings: 2 }, estimate, []],
      ['only the title changes', { title: 'New title' }, estimate, []],
      [
        'ingredients change and the stored nutrition came from the user',
        { ingredients: [{ name: 'Rice' }] },
        { energyKcal: 300, estimated: false },
        ['environmentalImpact'],
      ],
      [
        'ingredients change and the stored nutrition predates the flag',
        { ingredients: [{ name: 'Rice' }] },
        { energyKcal: 300 },
        ['environmentalImpact'],
      ],
      [
        'the user sends null to drop their own nutrition',
        { nutritionalInfo: null },
        { energyKcal: 300, estimated: false },
        ['environmentalImpact', 'nutritionalInfo'],
      ],
      [
        'the user sends new nutrition with the ingredients',
        { ingredients: [{ name: 'Rice' }], nutritionalInfo: { energyKcal: 1 } },
        estimate,
        ['environmentalImpact'],
      ],
    ])('on update when %s', async (_, dto, storedNutrition, expectedFields) => {
      const stored = {
        ...buildRecipe({ id: 'r1', userId }),
        nutritionalInfo: storedNutrition,
      };
      mockRecipeRepository.findById.mockResolvedValue(stored);
      mockRecipeRepository.update.mockResolvedValue(stored);

      await service.update('r1', dto, userId);

      expect(storedFields()).toEqual(
        expectedFields.length ? [expectedFields] : [],
      );
    });
  });

  it('should throw NotFound on findOne when recipe missing', async () => {
    mockRecipeRepository.findById.mockResolvedValue(null);

    await expect(service.findOne('missing', userId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFound on update when recipe missing', async () => {
    mockRecipeRepository.findById.mockResolvedValue(null);

    await expect(
      service.update('missing', { title: 'X' }, userId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should enforce ownership on remove', async () => {
    mockRecipeRepository.findById.mockResolvedValue({
      id: 'r1',
      userId: 'other',
    });

    await expect(service.remove('r1', userId)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should restrict access to public recipes with null owner', async () => {
    // Public recipes (userId=null) cannot be edited
    mockRecipeRepository.findById.mockResolvedValue({
      id: 'r1',
      userId: null,
      isPublic: true,
    });

    await expect(service.remove('r1', userId)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should build filters for findAll with new query fields', async () => {
    const paginationResult = emptyPaginationMock();
    mockRecipeRepository.findWithPagination.mockResolvedValue(paginationResult);

    await service.findAll(userId, {
      category: 'Chicken',
      cuisineType: 'Italian',
      tags: [' quick '],
      allergens: ['TREE_NUTS'],
      dietaryLabels: [' vegan '],
      difficulty: 'easy',
      search: 'pasta',
      page: 2,
      limit: 5,
    });

    expect(mockRecipeRepository.findWithPagination).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
      where: {
        OR: [{ userId }, { isPublic: true }],
        category: 'Chicken',
        cuisineType: 'Italian',
        difficulty: 'easy',
        tags: { hasSome: ['quick'] },
        allergens: { hasSome: ['TREE_NUTS'] },
        dietaryLabels: { hasSome: ['vegan'] },
        title: { contains: 'pasta', mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should map Prisma unique error to ResourceAlreadyExistsException on create', async () => {
    mockRecipeRepository.create.mockRejectedValue(
      new PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: '4.0.0',
        meta: { target: ['title'] },
      }),
    );

    await expect(
      service.create({ title: 'R' } as any, userId),
    ).rejects.toBeInstanceOf(ResourceAlreadyExistsException);
  });

  it('should map Prisma not found error to ResourceNotFoundException on update', async () => {
    mockRecipeRepository.findById.mockResolvedValue({
      id: 'r1',
      userId,
    });
    mockRecipeRepository.update.mockRejectedValue(
      new PrismaClientKnownRequestError('missing', {
        code: 'P2025',
        clientVersion: '4.0.0',
      }),
    );

    await expect(
      service.update('r1', { title: 'X' } as any, userId),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  // === Tests for revised database relations ===

  describe('Recipe-Meal relation (Recipe standalone, Meal references Recipe)', () => {
    it('should create recipe with external integration fields', async () => {
      const recipe = buildRecipe({
        id: 'r1',
        userId,
        title: 'Teriyaki Chicken',
        externalId: '52772',
        imageUrl: 'https://themealdb.com/images/meals/52772.jpg',
        videoUrl: 'https://youtube.com/watch?v=xyz',
        cuisineType: 'Japanese',
        category: 'Chicken',
        ingredients: [{ name: 'chicken', measure: '500g' }],
      });
      mockRecipeRepository.create.mockResolvedValue(recipe);

      const dto = {
        title: 'Teriyaki Chicken',
        externalId: '52772',
        imageUrl: 'https://themealdb.com/images/meals/52772.jpg',
        videoUrl: 'https://youtube.com/watch?v=xyz',
        cuisineType: 'Japanese',
        category: 'Chicken',
        ingredients: [{ name: 'chicken', measure: '500g' }],
      };

      const result = await service.create(dto, userId);

      expect(result.externalId).toBe('52772');
      expect(result.cuisineType).toBe('Japanese');
      expect(mockRecipeRepository.create).toHaveBeenCalledWith({
        ...dto,
        allergens: [],
        isPublic: false,
        origin: RecipeOrigin.USER,
        userId,
      });
    });

    it('should allow creating recipe without mealId (recipes are standalone)', async () => {
      const recipe = buildRecipe({ id: 'r1', userId, title: 'Simple Salad' });
      mockRecipeRepository.create.mockResolvedValue(recipe);

      // Note: no mealId required - recipes are standalone content
      const result = await service.create({ title: 'Simple Salad' }, userId);

      expect(result.id).toBe('r1');
      expect(mockRecipeRepository.create).toHaveBeenCalledWith({
        title: 'Simple Salad',
        userId,
        allergens: [],
        isPublic: false,
        origin: RecipeOrigin.USER,
      });
    });
  });

  describe('Public and system recipes visibility', () => {
    it('should include public recipes in findAll results for any user', async () => {
      const paginationResult = emptyPaginationMock({
        data: [
          buildRecipe({
            id: 'r1',
            userId,
            title: 'My Recipe',
            isPublic: false,
          }),
          buildRecipe({
            id: 'r2',
            userId: null,
            title: 'System Recipe',
            isPublic: true,
          }),
        ],
        total: 2,
        totalPages: 1,
      });
      mockRecipeRepository.findWithPagination.mockResolvedValue(
        paginationResult,
      );

      await service.findAll(userId, { page: 1, limit: 10 });

      // Verify OR condition for user's recipes AND public recipes
      expect(mockRecipeRepository.findWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ userId }, { isPublic: true }],
          }),
        }),
      );
    });

    it('should filter by isPublic when explicitly requested', async () => {
      const paginationResult = emptyPaginationMock();
      mockRecipeRepository.findWithPagination.mockResolvedValue(
        paginationResult,
      );

      await service.findAll(userId, {
        isPublic: true,
        page: 1,
        limit: 10,
      });

      expect(mockRecipeRepository.findWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublic: true,
          }),
        }),
      );
    });

    it('should allow findOne for public system recipes', async () => {
      const systemRecipe = buildRecipe({
        id: 'sys-1',
        userId: null,
        title: 'TheMealDB Recipe',
        isPublic: true,
        externalId: '52772',
      });
      mockRecipeRepository.findById.mockResolvedValue(systemRecipe);

      const result = await service.findOne('sys-1', userId);

      expect(result.id).toBe('sys-1');
      expect(result.title).toBe('TheMealDB Recipe');
      expect(result.isPublic).toBe(true);
    });

    it('should block findOne for private recipes owned by other users', async () => {
      const privateRecipe = buildRecipe({
        id: 'r-private',
        userId: 'other-user',
        title: 'Private Recipe',
        isPublic: false,
      });
      mockRecipeRepository.findById.mockResolvedValue(privateRecipe);

      await expect(service.findOne('r-private', userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('ingredient translations (NEVO)', () => {
    const recipeWithIngredients = () =>
      buildRecipe({
        id: 'r1',
        userId,
        ingredients: [
          buildRecipeIngredient({
            id: 'ing-linked',
            name: 'chicken breast',
            genericFoodId: STUB_GENERIC_FOOD_CHICKEN_NEVO.id,
            genericFood: { ...STUB_GENERIC_FOOD_CHICKEN_NEVO },
          }),
          buildRecipeIngredient({
            id: 'ing-unlinked',
            name: 'salt',
            itemType: 'food_product',
          }),
        ],
      });

    it('should not query translations for the default locale', async () => {
      mockRecipeRepository.findById.mockResolvedValue(recipeWithIngredients());

      const result = await service.findOne('r1', userId);

      expect(mockPrisma.entityTranslation.findMany).not.toHaveBeenCalled();
      expect(result.ingredients?.map((i) => i.name)).toEqual([
        'chicken breast',
        'salt',
      ]);
    });

    it('should overlay translated NEVO foodName on linked ingredients', async () => {
      mockRecipeRepository.findById.mockResolvedValue(recipeWithIngredients());
      mockPrisma.entityTranslation.findMany.mockResolvedValueOnce([
        {
          entityId: STUB_GENERIC_FOOD_CHICKEN_NEVO.id,
          field: 'foodName',
          value: 'Hähnchen',
        },
      ]);

      const result = await service.findOne('r1', userId, 'de');

      expect(mockPrisma.entityTranslation.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'GenericFood',
          entityId: { in: [STUB_GENERIC_FOOD_CHICKEN_NEVO.id] },
          locale: 'de',
          field: { in: ['foodName'] },
        },
      });
      const [linked, unlinked] = result.ingredients!;
      expect(linked.name).toBe('Hähnchen');
      expect(linked.genericFood).toEqual(
        expect.objectContaining({ foodName: 'Hähnchen', nevoCode: 1234 }),
      );
      expect(unlinked.name).toBe('salt');
    });

    it('should keep stored ingredient name when translation is missing', async () => {
      mockRecipeRepository.findById.mockResolvedValue(recipeWithIngredients());

      const result = await service.findOne('r1', userId, 'de');

      const [linked] = result.ingredients!;
      expect(linked.name).toBe('chicken breast');
      expect(linked.genericFood).toEqual(
        expect.objectContaining({ foodName: 'Chicken' }),
      );
    });

    it('should translate ingredients in list results', async () => {
      mockRecipeRepository.findWithPagination.mockResolvedValue(
        emptyPaginationMock({ data: [recipeWithIngredients()], total: 1 }),
      );
      mockPrisma.entityTranslation.findMany.mockResolvedValueOnce([
        {
          entityId: STUB_GENERIC_FOOD_CHICKEN_NEVO.id,
          field: 'foodName',
          value: 'Kip',
        },
      ]);

      const result = await service.findAll(userId, {
        page: 1,
        limit: 10,
        lang: 'nl',
      });

      expect(result.data[0].ingredients?.[0].name).toBe('Kip');
    });
  });

  describe('New query filters for recipes', () => {
    it.each([
      {
        query: { category: 'Chicken', page: 1 },
        where: { category: 'Chicken' },
      },
      {
        query: { cuisineType: 'Japanese', page: 1 },
        where: { cuisineType: 'Japanese' },
      },
      {
        query: { dietaryLabels: ['vegan', 'gluten-free'], page: 1 },
        where: { dietaryLabels: { hasSome: ['vegan', 'gluten-free'] } },
      },
    ])('should apply query filter %#', async ({ query, where }) => {
      mockRecipeRepository.findWithPagination.mockResolvedValue(
        emptyPaginationMock(),
      );

      await service.findAll(userId, query as any);

      expect(mockRecipeRepository.findWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining(where),
        }),
      );
    });
  });

  describe('Recipe ingredients handling', () => {
    const mockIngredients = [
      buildRecipeIngredient({
        id: 'ing-1',
        recipeId: 'r1',
        name: 'Chicken Breast',
        measure: '500g',
        order: 0,
        itemType: 'generic_food',
        genericFoodId: 'fc-1',
        genericFood: STUB_GENERIC_FOOD_CHICKEN_NEVO,
      }),
      buildRecipeIngredient({
        id: 'ing-2',
        recipeId: 'r1',
        name: 'Olive Oil',
        measure: '2 tbsp',
        order: 1,
        itemType: 'generic_food',
        genericFoodId: null,
      }),
    ];

    it('should create recipe with ingredients', async () => {
      const recipeWithIngredients = buildRecipe({
        id: 'r1',
        userId,
        title: 'Chicken Dinner',
        ingredients: mockIngredients,
      });
      mockRecipeRepository.create.mockResolvedValue(recipeWithIngredients);

      const createDto = {
        title: 'Chicken Dinner',
        ingredients: [
          { name: 'Chicken Breast', measure: '500g', genericFoodId: 'fc-1' },
          { name: 'Olive Oil', measure: '2 tbsp' },
        ],
      };

      const result = await service.create(createDto, userId);

      expect(result.ingredients).toBeDefined();
      expect(result.ingredients).toHaveLength(2);
      expect(mockRecipeRepository.create).toHaveBeenCalledWith({
        ...createDto,
        allergens: [],
        isPublic: false,
        origin: RecipeOrigin.USER,
        userId,
      });
    });

    it('should return recipe with ingredients in findOne', async () => {
      const recipeWithIngredients = buildRecipe({
        id: 'r1',
        userId,
        title: 'My Recipe',
        ingredients: mockIngredients,
      });
      mockRecipeRepository.findById.mockResolvedValue(recipeWithIngredients);

      const result = await service.findOne('r1', userId);

      expect(result.ingredients).toBeDefined();
      expect(result.ingredients!).toHaveLength(2);
      expect(result.ingredients![0].name).toBe('Chicken Breast');
    });

    it('should update recipe with new ingredients', async () => {
      mockRecipeRepository.findById.mockResolvedValue({
        id: 'r1',
        userId,
        ingredients: mockIngredients,
      });

      const updatedRecipe = buildRecipe({
        id: 'r1',
        userId,
        title: 'Updated Recipe',
        ingredients: [
          buildRecipeIngredient({
            id: 'ing-new',
            recipeId: 'r1',
            name: 'New Ingredient',
            measure: '100g',
            order: 0,
            itemType: 'generic_food',
          }),
        ],
      });
      mockRecipeRepository.update.mockResolvedValue(updatedRecipe);

      const result = await service.update(
        'r1',
        {
          title: 'Updated Recipe',
          ingredients: [{ name: 'New Ingredient', measure: '100g' }],
        },
        userId,
      );

      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients![0].name).toBe('New Ingredient');
    });

    it('should include ingredients with food category details in findAll', async () => {
      const paginationResult = emptyPaginationMock({
        data: [
          buildRecipe({
            id: 'r1',
            userId,
            title: 'Recipe 1',
            ingredients: mockIngredients,
          }),
        ],
        total: 1,
        totalPages: 1,
      });
      mockRecipeRepository.findWithPagination.mockResolvedValue(
        paginationResult,
      );

      const result = await service.findAll(userId, { page: 1, limit: 10 });

      expect(result.data[0].ingredients).toBeDefined();
      expect(result.data[0].ingredients![0].genericFood).toBeDefined();
    });

    it('should create recipe with ingredients linked to Food', async () => {
      const recipeWithFoodIngredient = buildRecipe({
        id: 'r1',
        userId,
        title: 'Product Recipe',
        ingredients: [
          buildRecipeIngredient({
            id: 'ing-1',
            recipeId: 'r1',
            name: 'Branded Product',
            measure: '1 pack',
            order: 0,
            itemType: 'food_product',
            foodProductId: 'food-1',
            foodProduct: buildMinimalRecipeIngredientFoodProduct({
              name: 'Branded Product',
            }),
          }),
        ],
      });
      mockRecipeRepository.create.mockResolvedValue(recipeWithFoodIngredient);

      const result = await service.create(
        {
          title: 'Product Recipe',
          ingredients: [
            {
              name: 'Branded Product',
              measure: '1 pack',
              foodProductId: 'food-1',
            },
          ],
        },
        userId,
      );

      expect(result.ingredients![0].foodProductId).toBe('food-1');
      expect(result.ingredients![0].foodProduct).toBeDefined();
    });
  });

  describe('ratings', () => {
    it('should return the aggregate and null myRating when user has not rated', async () => {
      mockRecipeRepository.findById.mockResolvedValue(
        buildRecipe({ id: 'r1', userId, rating: 4.5, ratingCount: 2 }),
      );
      mockRecipeRepository.findRating.mockResolvedValue(null);

      const result = await service.getRating('r1', userId);

      expect(result).toEqual({
        recipeId: 'r1',
        rating: 4.5,
        ratingCount: 2,
        myRating: null,
      });
    });

    it("should return the user's own rating when present", async () => {
      mockRecipeRepository.findById.mockResolvedValue(
        buildRecipe({ id: 'r1', userId, rating: 4, ratingCount: 1 }),
      );
      mockRecipeRepository.findRating.mockResolvedValue({ value: 4 });

      const result = await service.getRating('r1', userId);

      expect(result.myRating).toBe(4);
    });

    it('should allow rating a public recipe owned by someone else', async () => {
      mockRecipeRepository.findById.mockResolvedValue(
        buildRecipe({ id: 'r1', userId: 'other-user', isPublic: true }),
      );
      mockRecipeRepository.upsertRating.mockResolvedValue({
        recipeId: 'r1',
        rating: 4,
        ratingCount: 1,
        myRating: 4,
      });

      const result = await service.rate('r1', { value: 4 }, userId);

      expect(mockRecipeRepository.upsertRating).toHaveBeenCalledWith(
        'r1',
        userId,
        4,
      );
      expect(result.rating).toBe(4);
      expect(result.ratingCount).toBe(1);
      expect(result.myRating).toBe(4);
    });

    it('should reject rating a private recipe of another user', async () => {
      mockRecipeRepository.findById.mockResolvedValue(
        buildRecipe({ id: 'r1', userId: 'other-user', isPublic: false }),
      );

      await expect(service.rate('r1', { value: 4 }, userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockRecipeRepository.upsertRating).not.toHaveBeenCalled();
    });

    it('should throw NotFound when rating a missing recipe', async () => {
      mockRecipeRepository.findById.mockResolvedValue(null);

      await expect(service.rate('r1', { value: 4 }, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should remove the rating and return the recomputed aggregate', async () => {
      mockRecipeRepository.findById.mockResolvedValue(
        buildRecipe({ id: 'r1', userId }),
      );
      mockRecipeRepository.deleteRating.mockResolvedValue({
        recipeId: 'r1',
        rating: 0,
        ratingCount: 0,
        myRating: null,
      });

      const result = await service.removeRating('r1', userId);

      expect(mockRecipeRepository.deleteRating).toHaveBeenCalledWith(
        'r1',
        userId,
      );
      expect(result.ratingCount).toBe(0);
      expect(result.myRating).toBeNull();
    });

    it('should throw NotFound when removing a rating the user never gave', async () => {
      mockRecipeRepository.findById.mockResolvedValue(
        buildRecipe({ id: 'r1', userId }),
      );
      mockRecipeRepository.deleteRating.mockResolvedValue(null);

      await expect(service.removeRating('r1', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
