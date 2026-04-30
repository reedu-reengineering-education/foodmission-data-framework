import { Test, TestingModule } from '@nestjs/testing';
import { RecipeNutritionService } from './recipe-nutrition.service';
import { PrismaService } from '../../database/prisma.service';

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

  describe('calculateNutrition', () => {
    it('should return empty nutrition for non-existent recipe', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(null);

      const result = await service.calculateNutrition('non-existent');

      expect(result).toEqual({
        confidence: 0,
        missingIngredients: [],
      });
    });

    it('should return empty nutrition for recipe with no ingredients', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue({
        id: 'recipe-1',
        servings: 4,
        ingredients: [],
      });

      const result = await service.calculateNutrition('recipe-1');

      expect(result.confidence).toBe(0);
      expect(result.missingIngredients).toEqual([]);
    });

    it('should aggregate nutrition from FoodCategory', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue({
        id: 'recipe-1',
        servings: 2,
        ingredients: [
          {
            name: 'Chicken Breast',
            measure: '200g',
            food: null,
            foodCategory: {
              id: 'fc-1',
              foodName: 'Chicken breast, raw',
              energyKcal: 120,
              energyKj: 502,
              proteins: 22,
              fat: 3,
              saturatedFat: 0.8,
              transFat: 0,
              carbohydrates: 0,
              sugars: 0,
              fiber: 0,
              sodium: 60,
              vitaminA: null,
              vitaminC: 0,
              vitaminD: 0.1,
              calcium: 10,
              iron: 0.5,
              potassium: 320,
            },
          },
        ],
      });

      const result = await service.calculateNutrition('recipe-1');

      // 200g of chicken: 120kcal/100g * 2 = 240kcal
      expect(result.energyKcal).toBe(240);
      expect(result.proteins).toBe(44);
      expect(result.fat).toBe(6);
      expect(result.confidence).toBeGreaterThan(0.9); // high confidence for gram measure
      expect(result.servings).toBe(2);
      expect(result.perServing?.energyKcal).toBe(120);
    });

    it('should aggregate nutrition from Food', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue({
        id: 'recipe-1',
        servings: 4,
        ingredients: [
          {
            name: 'Olive Oil',
            measure: '2 tablespoons',
            food: {
              id: 'f-1',
              name: 'Olive Oil',
              energyKcal: 884,
              energyKj: 3699,
              proteins: 0,
              fat: 100,
              saturatedFat: 14,
              transFat: 0,
              carbohydrates: 0,
              sugars: 0,
              fiber: 0,
              sodium: 0,
              salt: 0,
              vitaminA: 0,
              vitaminC: 0,
              calcium: 0,
              iron: 0,
              potassium: 0,
            },
            foodCategory: null,
          },
        ],
      });

      const result = await service.calculateNutrition('recipe-1');

      // 2 tbsp = 30g, so 884kcal/100g * 0.3 = 265.2 → 265.2
      expect(result.energyKcal).toBeCloseTo(265.2, 0);
      expect(result.fat).toBe(30);
      expect(result.confidence).toBeGreaterThan(0.6); // medium confidence for volume
    });

    it('should handle multiple ingredients', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue({
        id: 'recipe-1',
        servings: 2,
        ingredients: [
          {
            name: 'Rice',
            measure: '100g',
            food: null,
            foodCategory: {
              id: 'fc-1',
              foodName: 'White rice',
              energyKcal: 130,
              energyKj: 544,
              proteins: 2.7,
              fat: 0.3,
              saturatedFat: 0.1,
              transFat: 0,
              carbohydrates: 28,
              sugars: 0.1,
              fiber: 0.4,
              sodium: 1,
              vitaminA: null,
              vitaminC: 0,
              vitaminD: null,
              calcium: 10,
              iron: 0.2,
              potassium: 35,
            },
          },
          {
            name: 'Egg',
            measure: '2',
            food: null,
            foodCategory: {
              id: 'fc-2',
              foodName: 'Egg, whole',
              energyKcal: 155,
              energyKj: 649,
              proteins: 13,
              fat: 11,
              saturatedFat: 3.3,
              transFat: 0,
              carbohydrates: 1.1,
              sugars: 1.1,
              fiber: 0,
              sodium: 124,
              vitaminA: 160,
              vitaminC: 0,
              vitaminD: 2,
              calcium: 56,
              iron: 1.8,
              potassium: 138,
            },
          },
        ],
      });

      const result = await service.calculateNutrition('recipe-1');

      // Rice: 100g = 130kcal
      // Egg: 2 eggs = 100g (50g each), 155kcal
      // Total: 285kcal
      expect(result.energyKcal).toBe(285);
      expect(result.proteins).toBeCloseTo(15.7, 0); // 2.7 + 13
      expect(result.servings).toBe(2);
      expect(result.perServing?.energyKcal).toBe(142.5);
    });

    it('should track missing ingredients', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue({
        id: 'recipe-1',
        servings: null,
        ingredients: [
          {
            name: 'Chicken',
            measure: '100g',
            food: {
              id: 'f-1',
              name: 'Chicken',
              energyKcal: 165,
              proteins: 31,
              fat: 3.6,
              carbohydrates: 0,
            },
            foodCategory: null,
          },
          {
            name: 'Secret Spice',
            measure: '1 tsp',
            food: null,
            foodCategory: null,
          },
        ],
      });

      const result = await service.calculateNutrition('recipe-1');

      expect(result.missingIngredients).toContain('Secret Spice');
      expect(result.confidence).toBeLessThan(1); // reduced due to missing ingredient
    });

    it('should skip qualitative measures', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue({
        id: 'recipe-1',
        servings: 1,
        ingredients: [
          {
            name: 'Salt',
            measure: 'To taste',
            food: {
              id: 'f-1',
              name: 'Salt',
              energyKcal: 0,
              proteins: 0,
              fat: 0,
              carbohydrates: 0,
              sodium: 38758,
            },
            foodCategory: null,
          },
          {
            name: 'Chicken',
            measure: '100g',
            food: {
              id: 'f-2',
              name: 'Chicken',
              energyKcal: 165,
              proteins: 31,
              fat: 3.6,
              carbohydrates: 0,
              sodium: 74,
            },
            foodCategory: null,
          },
        ],
      });

      const result = await service.calculateNutrition('recipe-1');

      // Salt "to taste" should be skipped, so sodium should only be from chicken
      expect(result.sodium).toBe(74);
      expect(result.energyKcal).toBe(165);
    });

    it('should not include perServing when servings is null', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue({
        id: 'recipe-1',
        servings: null,
        ingredients: [
          {
            name: 'Pasta',
            measure: '200g',
            food: null,
            foodCategory: {
              id: 'fc-1',
              foodName: 'Pasta',
              energyKcal: 350,
              proteins: 12,
              fat: 1.5,
              carbohydrates: 72,
              sugars: 2,
              fiber: 3,
              sodium: 5,
            },
          },
        ],
      });

      const result = await service.calculateNutrition('recipe-1');

      expect(result.servings).toBeUndefined();
      expect(result.perServing).toBeUndefined();
    });

    it('should handle ingredient without measure', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue({
        id: 'recipe-1',
        servings: 1,
        ingredients: [
          {
            name: 'Apple',
            measure: null,
            food: null,
            foodCategory: {
              id: 'fc-1',
              foodName: 'Apple',
              energyKcal: 52,
              proteins: 0.3,
              fat: 0.2,
              carbohydrates: 14,
              sugars: 10,
              fiber: 2.4,
              sodium: 1,
            },
          },
        ],
      });

      const result = await service.calculateNutrition('recipe-1');

      // Defaults to 100g when measure is null
      expect(result.energyKcal).toBe(52);
    });
  });

  describe('updateRecipeNutrition', () => {
    it('should calculate and persist nutrition', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue({
        id: 'recipe-1',
        servings: 4,
        ingredients: [
          {
            name: 'Beef',
            measure: '500g',
            food: null,
            foodCategory: {
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
      expect(result.energyKcal).toBe(1250);
      expect(result.perServing?.energyKcal).toBe(312.5);
    });
  });
});
