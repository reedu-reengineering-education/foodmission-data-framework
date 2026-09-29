import { Test, TestingModule } from '@nestjs/testing';
import { RecipesRepository } from './recipes.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  buildRecipe,
  buildRecipeIngredient,
} from '../../../test/fixtures/recipe.fixtures';
import {
  RECIPE_WITH_INGREDIENTS_AND_MEALS_INCLUDE,
  RECIPE_WITH_INGREDIENTS_INCLUDE,
} from '../../common/types/prisma-relations';

describe('RecipesRepository', () => {
  let repository: RecipesRepository;
  let mockPrismaService: any;

  const mockRecipe = buildRecipe({ id: 'recipe-1' });

  const mockIngredients = [
    buildRecipeIngredient({
      id: 'ing-1',
      recipeId: 'recipe-1',
      name: 'Chicken',
      measure: '500g',
      order: 0,
      itemType: 'generic_food',
      foodProductId: null,
      genericFoodId: 'fc-1',
    }),
    buildRecipeIngredient({
      id: 'ing-2',
      recipeId: 'recipe-1',
      name: 'Salt',
      measure: '1 tsp',
      order: 1,
      itemType: 'generic_food',
      foodProductId: null,
      genericFoodId: null,
    }),
  ];

  const expectedInclude = RECIPE_WITH_INGREDIENTS_INCLUDE;

  beforeEach(async () => {
    mockPrismaService = {
      recipe: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      recipeIngredient: {
        deleteMany: jest.fn(),
      },
      recipeRating: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<RecipesRepository>(RecipesRepository);
    jest.clearAllMocks();
  });

  describe('findWithPagination', () => {
    it('should normalize non-positive take values and return normalized limit', async () => {
      mockPrismaService.recipe.findMany.mockResolvedValueOnce([mockRecipe]);
      mockPrismaService.recipe.count.mockResolvedValueOnce(1);

      const result = await repository.findWithPagination({ take: 0, skip: 0 });

      expect(mockPrismaService.recipe.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
        include: expectedInclude,
      });
      expect(result.limit).toBe(10);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate page and totalPages based on normalized pagination', async () => {
      mockPrismaService.recipe.findMany.mockResolvedValueOnce([mockRecipe]);
      mockPrismaService.recipe.count.mockResolvedValueOnce(25);

      const result = await repository.findWithPagination({ skip: 12, take: 5 });

      expect(mockPrismaService.recipe.findMany).toHaveBeenCalledWith({
        skip: 12,
        take: 5,
        where: undefined,
        orderBy: { createdAt: 'desc' },
        include: expectedInclude,
      });
      expect(result.page).toBe(3); // floor(12 / 5) + 1
      expect(result.totalPages).toBe(5); // ceil(25 / 5)
      expect(result.limit).toBe(5);
    });
  });

  describe('findById', () => {
    it('should include ingredients relation when finding by id', async () => {
      const recipeWithIngredients = {
        ...mockRecipe,
        ingredients: mockIngredients,
      };
      mockPrismaService.recipe.findUnique.mockResolvedValueOnce(
        recipeWithIngredients,
      );

      const result = await repository.findById('recipe-1');

      expect(mockPrismaService.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        include: RECIPE_WITH_INGREDIENTS_AND_MEALS_INCLUDE,
      });
      expect(result).toEqual(recipeWithIngredients);
      expect((result as { ingredients?: unknown[] }).ingredients).toHaveLength(
        2,
      );
    });

    it('should return null when recipe not found', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValueOnce(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create recipe without ingredients', async () => {
      mockPrismaService.recipe.create.mockResolvedValueOnce(mockRecipe);

      const result = await repository.create({
        userId: 'user-1',
        title: 'Test Recipe',
      });

      expect(mockPrismaService.recipe.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Test Recipe',
          ingredients: undefined,
        },
        include: RECIPE_WITH_INGREDIENTS_AND_MEALS_INCLUDE,
      });
      expect(result.title).toBe('Test Recipe');
    });

    it('should create recipe with ingredients using nested create', async () => {
      const recipeWithIngredients = {
        ...mockRecipe,
        ingredients: mockIngredients,
      };
      mockPrismaService.recipe.create.mockResolvedValueOnce(
        recipeWithIngredients,
      );

      const result = await repository.create({
        userId: 'user-1',
        title: 'Test Recipe',
        ingredients: [
          { name: 'Chicken', measure: '500g', genericFoodId: 'fc-1' },
          { name: 'Salt', measure: '1 tsp' },
        ],
      });

      expect(mockPrismaService.recipe.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Test Recipe',
          ingredients: {
            create: [
              {
                name: 'Chicken',
                measure: '500g',
                order: 0,
                itemType: 'generic_food',
                foodProductId: null,
                genericFoodId: 'fc-1',
              },
              {
                name: 'Salt',
                measure: '1 tsp',
                order: 1,
                itemType: 'generic_food',
                foodProductId: null,
                genericFoodId: null,
              },
            ],
          },
        },
        include: RECIPE_WITH_INGREDIENTS_AND_MEALS_INCLUDE,
      });
      expect((result as { ingredients?: unknown[] }).ingredients).toHaveLength(
        2,
      );
    });

    it('should set itemType to food_product when foodProductId is provided', async () => {
      mockPrismaService.recipe.create.mockResolvedValueOnce({
        ...mockRecipe,
        ingredients: [
          {
            ...mockIngredients[0],
            itemType: 'food_product',
            foodProductId: 'food-1',
          },
        ],
      });

      await repository.create({
        userId: 'user-1',
        title: 'Test Recipe',
        ingredients: [
          { name: 'Product X', measure: '100g', foodProductId: 'food-1' },
        ],
      });

      expect(mockPrismaService.recipe.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ingredients: {
            create: [
              expect.objectContaining({
                itemType: 'food_product',
                foodProductId: 'food-1',
                genericFoodId: null,
              }),
            ],
          },
        }),
        include: expect.any(Object),
      });
    });

    it('should preserve explicit order values in ingredients', async () => {
      mockPrismaService.recipe.create.mockResolvedValueOnce({
        ...mockRecipe,
        ingredients: mockIngredients,
      });

      await repository.create({
        userId: 'user-1',
        title: 'Test Recipe',
        ingredients: [
          { name: 'Second', measure: '1', order: 5 },
          { name: 'First', measure: '2', order: 1 },
        ],
      });

      expect(mockPrismaService.recipe.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ingredients: {
            create: [
              expect.objectContaining({ name: 'Second', order: 5 }),
              expect.objectContaining({ name: 'First', order: 1 }),
            ],
          },
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    it('should update recipe without touching ingredients when not provided', async () => {
      mockPrismaService.recipe.update.mockResolvedValueOnce({
        ...mockRecipe,
        title: 'Updated Title',
      });

      const result = await repository.update('recipe-1', {
        title: 'Updated Title',
      });

      expect(mockPrismaService.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: { title: 'Updated Title' },
        include: RECIPE_WITH_INGREDIENTS_AND_MEALS_INCLUDE,
      });
      expect(result.title).toBe('Updated Title');
    });

    it('should replace all ingredients when ingredients array is provided', async () => {
      mockPrismaService.recipeIngredient.deleteMany.mockResolvedValueOnce({
        count: 2,
      });
      mockPrismaService.recipe.update.mockResolvedValueOnce({
        ...mockRecipe,
        ingredients: [{ ...mockIngredients[0], name: 'New Ingredient' }],
      });

      const result = await repository.update('recipe-1', {
        ingredients: [{ name: 'New Ingredient', measure: '200g' }],
      });

      // Should use transaction
      expect(mockPrismaService.$transaction).toHaveBeenCalled();

      // Should delete existing ingredients
      expect(
        mockPrismaService.recipeIngredient.deleteMany,
      ).toHaveBeenCalledWith({
        where: { recipeId: 'recipe-1' },
      });

      // Should create new ingredients
      expect(mockPrismaService.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: {
          ingredients: {
            create: [
              {
                name: 'New Ingredient',
                measure: '200g',
                order: 0,
                itemType: 'generic_food',
                foodProductId: null,
                genericFoodId: null,
              },
            ],
          },
        },
        include: RECIPE_WITH_INGREDIENTS_AND_MEALS_INCLUDE,
      });
      expect((result as { ingredients?: unknown[] }).ingredients).toHaveLength(
        1,
      );
    });

    it('should clear all ingredients when empty array is provided', async () => {
      mockPrismaService.recipeIngredient.deleteMany.mockResolvedValueOnce({
        count: 2,
      });
      mockPrismaService.recipe.update.mockResolvedValueOnce({
        ...mockRecipe,
        ingredients: [],
      });

      await repository.update('recipe-1', { ingredients: [] });

      expect(
        mockPrismaService.recipeIngredient.deleteMany,
      ).toHaveBeenCalledWith({
        where: { recipeId: 'recipe-1' },
      });
      expect(mockPrismaService.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: { ingredients: undefined },
        include: RECIPE_WITH_INGREDIENTS_AND_MEALS_INCLUDE,
      });
    });
  });

  describe('delete', () => {
    it('should delete recipe (cascade deletes ingredients)', async () => {
      mockPrismaService.recipe.delete.mockResolvedValueOnce(mockRecipe);

      await repository.delete('recipe-1');

      expect(mockPrismaService.recipe.delete).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
      });
    });
  });

  describe('count', () => {
    it('should count recipes with optional where clause', async () => {
      mockPrismaService.recipe.count.mockResolvedValueOnce(42);

      const result = await repository.count({ isPublic: true });

      expect(mockPrismaService.recipe.count).toHaveBeenCalledWith({
        where: { isPublic: true },
      });
      expect(result).toBe(42);
    });
  });

  describe('ratings', () => {
    it('should upsert the rating and write back the recomputed aggregate', async () => {
      mockPrismaService.recipeRating.upsert.mockResolvedValueOnce({
        id: 'rating-1',
      });
      mockPrismaService.recipeRating.aggregate.mockResolvedValueOnce({
        _avg: { value: 4.5 },
        _count: { value: 2 },
      });

      const result = await repository.upsertRating('recipe-1', 'user-1', 5);

      expect(mockPrismaService.recipeRating.upsert).toHaveBeenCalledWith({
        where: { recipeId_userId: { recipeId: 'recipe-1', userId: 'user-1' } },
        create: { recipeId: 'recipe-1', userId: 'user-1', value: 5 },
        update: { value: 5 },
      });
      expect(mockPrismaService.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: { rating: 4.5, ratingCount: 2 },
      });
      expect(result).toEqual({
        recipeId: 'recipe-1',
        rating: 4.5,
        ratingCount: 2,
        myRating: 5,
      });
    });

    it('should reset the aggregate to zero when the last rating is removed', async () => {
      mockPrismaService.recipeRating.deleteMany.mockResolvedValueOnce({
        count: 1,
      });
      mockPrismaService.recipeRating.aggregate.mockResolvedValueOnce({
        _avg: { value: null },
        _count: { value: 0 },
      });

      const result = await repository.deleteRating('recipe-1', 'user-1');

      expect(mockPrismaService.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: { rating: 0, ratingCount: 0 },
      });
      expect(result).toEqual({
        recipeId: 'recipe-1',
        rating: 0,
        ratingCount: 0,
        myRating: null,
      });
    });

    it('should return null and leave the aggregate untouched when nothing was deleted', async () => {
      mockPrismaService.recipeRating.deleteMany.mockResolvedValueOnce({
        count: 0,
      });

      const result = await repository.deleteRating('recipe-1', 'user-1');

      expect(result).toBeNull();
      expect(mockPrismaService.recipeRating.aggregate).not.toHaveBeenCalled();
      expect(mockPrismaService.recipe.update).not.toHaveBeenCalled();
    });
  });
});
