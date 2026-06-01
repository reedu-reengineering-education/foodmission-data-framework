import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from './recommendations.service';
import { PantryService } from '../../pantry/services/pantry.service';
import { PantryItemRepository } from '../../pantry/repositories/pantry-items.repository';
import { RecipesRepository } from '../repositories/recipes.repository';

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  const mockPantryService = {
    validatePantryExists: jest.fn(),
  };

  const mockPantryItemRepository = {
    findMany: jest.fn(),
  };

  const mockRecipesRepository = {
    findCandidatesForRecommendation: jest.fn(),
    findWithPagination: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: PantryService, useValue: mockPantryService },
        { provide: PantryItemRepository, useValue: mockPantryItemRepository },
        { provide: RecipesRepository, useValue: mockRecipesRepository },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    jest.clearAllMocks();
  });

  it('falls back to name-based matching when id-based candidates are empty', async () => {
    mockPantryService.validatePantryExists.mockResolvedValue('pantry-1');
    mockPantryItemRepository.findMany.mockResolvedValue([
      {
        id: 'pantry-item-1',
        pantryId: 'pantry-1',
        foodProductId: 'food-1',
        genericFoodId: null,
        expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        foodProduct: { name: 'Organic Oat Milks' },
        genericFood: null,
      },
    ]);
    mockRecipesRepository.findCandidatesForRecommendation.mockResolvedValue([]);
    mockRecipesRepository.findWithPagination.mockResolvedValue({
      data: [
        {
          id: 'recipe-1',
          userId: 'user-1',
          title: 'Overnight Oats',
          description: null,
          instructions: null,
          prepTime: null,
          cookTime: null,
          servings: null,
          difficulty: null,
          tags: [],
          nutritionalInfo: null,
          sustainabilityScore: null,
          price: null,
          allergens: [],
          rating: 0,
          ratingCount: 0,
          externalId: null,
          imageUrl: null,
          videoUrl: null,
          cuisineType: null,
          category: null,
          isPublic: true,
          dietaryLabels: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          ingredients: [
            {
              id: 'ing-1',
              recipeId: 'recipe-1',
              name: 'Organic Oat Milk',
              measure: '200ml',
              order: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              itemType: 'generic_food',
              foodProductId: null,
              genericFoodId: null,
              foodProduct: null,
              genericFood: null,
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });

    const result = await service.getRecommendations('user-1', {
      expiringWithinDays: 60,
      limit: 10,
      offset: 0,
    });

    expect(mockRecipesRepository.findWithPagination).toHaveBeenCalled();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].matchCount).toBe(1);
    expect(result.data[0].expiringMatchCount).toBe(1);
    expect(result.data[0].matchedIngredients[0].pantryItemName).toBe(
      'Organic Oat Milks',
    );
  });
});
