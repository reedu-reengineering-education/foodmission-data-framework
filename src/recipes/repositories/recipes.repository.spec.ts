import { Prisma } from '@prisma/client';
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
        findMany: jest.fn(),
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

    it('maps each ingredient: order, link type, amount as sent', async () => {
      mockPrismaService.recipe.create.mockResolvedValueOnce(mockRecipe);

      await repository.create({
        userId: 'user-1',
        title: 'Test Recipe',
        ingredients: [
          { name: 'Chicken', measure: '500g', genericFoodId: 'fc-1' },
          { name: 'Product X', foodProductId: 'food-1', order: 5 },
          { name: 'Flour', measure: '2 tbsp', quantity: 20, unit: 'G' },
        ],
      });

      expect(
        mockPrismaService.recipe.create.mock.calls[0][0].data.ingredients,
      ).toEqual({
        create: [
          {
            name: 'Chicken',
            measure: '500g',
            quantity: null,
            unit: null,
            order: 0,
            itemType: 'generic_food',
            foodProductId: null,
            genericFoodId: 'fc-1',
          },
          {
            name: 'Product X',
            measure: null,
            quantity: null,
            unit: null,
            order: 5,
            itemType: 'food_product',
            foodProductId: 'food-1',
            genericFoodId: null,
          },
          {
            name: 'Flour',
            measure: '2 tbsp',
            quantity: 20,
            unit: 'G',
            order: 2,
            itemType: 'generic_food',
            foodProductId: null,
            genericFoodId: null,
          },
        ],
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

    it.each([
      ['replaces all ingredients', [{ name: 'Rice', measure: '200g' }], 1],
      ['clears all ingredients', [], 0],
    ])('%s when ingredients are sent', async (_, ingredients, created) => {
      mockPrismaService.recipe.update.mockResolvedValueOnce(mockRecipe);

      await repository.update('recipe-1', { ingredients });

      const { data } = mockPrismaService.recipe.update.mock.calls[0][0];
      expect(data.ingredients.deleteMany).toEqual({});
      expect(data.ingredients.create).toHaveLength(created);
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

  describe('findCuratedGenericFoodIds', () => {
    it('finds the seeded link for a name written in a different case', async () => {
      mockPrismaService.recipeIngredient.findMany.mockResolvedValue([
        { name: 'Olive Oil', genericFoodId: 'oil-olive' },
      ]);

      const ids = await repository.findCuratedGenericFoodIds(['olive oil']);

      expect(ids).toEqual(new Map([['olive oil', 'oil-olive']]));
      expect(mockPrismaService.recipeIngredient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { in: ['olive oil'], mode: 'insensitive' },
          }),
          distinct: ['name'],
        }),
      );
    });

    it('does not query for an empty list', async () => {
      await expect(repository.findCuratedGenericFoodIds([])).resolves.toEqual(
        new Map(),
      );
      expect(
        mockPrismaService.recipeIngredient.findMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('updateEstimates', () => {
    it.each([
      [
        { nutritionalInfo: null, carbonFootprint: 2.5 },
        { nutritionalInfo: Prisma.JsonNull, carbonFootprint: 2.5 },
      ],
      [{ carbonFootprint: null }, { carbonFootprint: null }],
    ])(
      'writes only the estimates it is given (%o)',
      async (estimates, data) => {
        mockPrismaService.recipe.update.mockResolvedValueOnce(mockRecipe);

        await repository.updateEstimates('recipe-1', estimates);

        expect(mockPrismaService.recipe.update).toHaveBeenCalledWith({
          where: { id: 'recipe-1' },
          data,
        });
      },
    );
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
