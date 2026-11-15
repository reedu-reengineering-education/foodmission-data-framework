import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { RecipeNutritionService } from './recipe-nutrition.service';
import { PrismaService } from '../../database/prisma.service';
import { RECIPE_INGREDIENT_APPLE_GENERIC_FOOD } from '../../../test/fixtures/food-ref.fixtures';

describe('RecipeNutritionService', () => {
  let service: RecipeNutritionService;

  const mockPrismaService = {
    recipe: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipeNutritionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RecipeNutritionService>(RecipeNutritionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateRecipeNutrition', () => {
    it('should return null and write nothing when the recipe does not exist', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRecipeNutrition('missing'),
      ).resolves.toBeNull();
      expect(mockPrismaService.recipe.update).not.toHaveBeenCalled();
    });

    it('should calculate and persist nutrition', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue({
        id: 'recipe-1',
        servings: 4,
        ingredients: [
          {
            name: 'Beef',
            measure: '500g',
            foodProduct: null,
            genericFood: {
              id: 'fc-1',
              foodName: 'Beef',
              energyKcal: 250,
              energyKj: 1046,
              proteins: 26,
              fat: 15,
              saturatedFat: 6,
              transFat: 0,
              carbohydrates: 0,
              sugars: 0,
              fiber: 0,
              sodium: 59,
            },
          },
        ],
      });
      mockPrismaService.recipe.update.mockResolvedValue({});

      const result = await service.updateRecipeNutrition('recipe-1');

      expect(mockPrismaService.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: { nutritionalInfo: expect.any(Object) },
      });

      // 500g of beef = 1250kcal
      expect(result?.energyKcal).toBe(1250);
      expect(result?.per100g?.energyKcal).toBe(250);
    });

    it('should clear nutrition when an ingredient cannot be weighed', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue({
        id: 'recipe-1',
        servings: 1,
        ingredients: [
          {
            name: 'Apple',
            measure: null,
            quantity: null,
            unit: null,
            foodProduct: null,
            genericFood: RECIPE_INGREDIENT_APPLE_GENERIC_FOOD,
          },
        ],
      });
      mockPrismaService.recipe.update.mockResolvedValue({});

      const result = await service.updateRecipeNutrition('recipe-1');

      expect(result).toBeNull();
      expect(mockPrismaService.recipe.update).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
        data: { nutritionalInfo: Prisma.JsonNull },
      });
    });
  });
});
