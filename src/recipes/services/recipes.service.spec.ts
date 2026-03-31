import { Test, TestingModule } from '@nestjs/testing';
import { RecipesService } from './recipes.service';
import { RecipesRepository } from '../repositories/recipes.repository';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
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

describe('RecipesService', () => {
  let service: RecipesService;
  const userId = 'user-1';

  const mockRecipeRepository = {
    create: jest.fn(),
    findWithPagination: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: RecipesRepository, useValue: mockRecipeRepository },
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

    const result = await service.create(
      { title: 'Test Recipe' } as any,
      userId,
    );

    expect(result.id).toBe('r1');
    expect(mockRecipeRepository.create).toHaveBeenCalledWith({
      title: 'Test Recipe',
      userId,
      allergens: [],
      isPublic: false,
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
      allergens: ['TREE_NUTS' as any],
      dietaryLabels: [' vegan '],
      difficulty: 'easy',
      search: 'pasta',
      page: 2,
      limit: 5,
    } as any);

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
      } as any),
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
      } as any),
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

      const result = await service.create(dto as any, userId);

      expect(result.externalId).toBe('52772');
      expect(result.cuisineType).toBe('Japanese');
      expect(mockRecipeRepository.create).toHaveBeenCalledWith({
        ...dto,
        allergens: [],
        isPublic: false,
        userId,
      });
    });

    it('should allow creating recipe without mealId (recipes are standalone)', async () => {
      const recipe = buildRecipe({ id: 'r1', userId, title: 'Simple Salad' });
      mockRecipeRepository.create.mockResolvedValue(recipe);

      // Note: no mealId required - recipes are standalone content
      const result = await service.create(
        { title: 'Simple Salad' } as any,
        userId,
      );

      expect(result.id).toBe('r1');
      expect(mockRecipeRepository.create).toHaveBeenCalledWith({
        title: 'Simple Salad',
        userId,
        allergens: [],
        isPublic: false,
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
      } as any);

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
        itemType: 'food_category',
        foodCategoryId: 'fc-1',
        foodCategory: { id: 'fc-1', foodName: 'Chicken', nevoCode: 1234 },
      }),
      buildRecipeIngredient({
        id: 'ing-2',
        recipeId: 'r1',
        name: 'Olive Oil',
        measure: '2 tbsp',
        order: 1,
        itemType: 'food_category',
        foodCategoryId: null,
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
          { name: 'Chicken Breast', measure: '500g', foodCategoryId: 'fc-1' },
          { name: 'Olive Oil', measure: '2 tbsp' },
        ],
      };

      const result = await service.create(createDto as any, userId);

      expect(result.ingredients).toBeDefined();
      expect(result.ingredients).toHaveLength(2);
      expect(mockRecipeRepository.create).toHaveBeenCalledWith({
        ...createDto,
        allergens: [],
        isPublic: false,
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
            itemType: 'food_category',
          }),
        ],
      });
      mockRecipeRepository.update.mockResolvedValue(updatedRecipe);

      const result = await service.update(
        'r1',
        {
          title: 'Updated Recipe',
          ingredients: [{ name: 'New Ingredient', measure: '100g' }],
        } as any,
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
      expect(result.data[0].ingredients![0].foodCategory).toBeDefined();
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
            itemType: 'food',
            foodId: 'food-1',
            food: {
              id: 'food-1',
              name: 'Branded Product',
              imageUrl: 'http://...',
            },
          }),
        ],
      });
      mockRecipeRepository.create.mockResolvedValue(recipeWithFoodIngredient);

      const result = await service.create(
        {
          title: 'Product Recipe',
          ingredients: [
            { name: 'Branded Product', measure: '1 pack', foodId: 'food-1' },
          ],
        } as any,
        userId,
      );

      expect(result.ingredients![0].foodId).toBe('food-1');
      expect(result.ingredients![0].food).toBeDefined();
    });
  });
});
