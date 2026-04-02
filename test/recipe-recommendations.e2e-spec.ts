import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../src/common/guards/database-auth.guards';
import { createTestApp, closeTestApp } from './test-utils/e2e-helpers';
import { RecommendationsController } from '../src/recipes/controllers/recommendations.controller';
import { RecommendationsService } from '../src/recipes/services/recommendations.service';

describe('Recipe Recommendations (e2e)', () => {
  let app: INestApplication;

  const mockRecommendationsService = {
    getRecommendations: jest.fn().mockResolvedValue({
      data: [
        {
          recipeId: 'test-recipe-id',
          recipe: {
            id: 'test-recipe-id',
            title: 'Test Recipe',
            description: 'A test recipe',
            category: 'Chicken',
            cuisineType: 'Italian',
          },
          matchCount: 6,
          totalIngredients: 8,
          expiringMatchCount: 2,
          matchedIngredients: [
            {
              ingredientName: 'Chicken Breast',
              pantryItemName: 'Chicken Breast',
              isExpiringSoon: true,
              daysUntilExpiry: 3,
            },
            {
              ingredientName: 'Olive Oil',
              pantryItemName: 'Olive Oil',
              isExpiringSoon: false,
              daysUntilExpiry: 180,
            },
          ],
        },
      ],
      expiringItemsCount: 5,
      totalPantryItems: 15,
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        {
          provide: RecommendationsService,
          useValue: mockRecommendationsService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = { id: 'test-user-id', email: 'test@example.com' };
          return true;
        },
      })
      .compile();

    app = await createTestApp(moduleFixture);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /recipes/me/recommendations', () => {
    it('should return recipe recommendations with default parameters', async () => {
      const res = await request(app.getHttpServer())
        .get('/recipes/me/recommendations')
        .expect(200);

      expect(res.body).toEqual(
        expect.objectContaining({
          data: expect.any(Array),
          expiringItemsCount: expect.any(Number),
          totalPantryItems: expect.any(Number),
        }),
      );

      expect(
        mockRecommendationsService.getRecommendations,
      ).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          expiringWithinDays: undefined,
          limit: undefined,
        }),
      );
    });

    it('should pass query parameters to service', async () => {
      await request(app.getHttpServer())
        .get('/recipes/me/recommendations')
        .query({
          expiringWithinDays: 14,
          limit: 5,
        })
        .expect(200);

      expect(
        mockRecommendationsService.getRecommendations,
      ).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          expiringWithinDays: '14',
          limit: '5',
        }),
      );
    });

    it('should return recommendation data with expected structure', async () => {
      const res = await request(app.getHttpServer())
        .get('/recipes/me/recommendations')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      const recommendation = res.body.data[0];

      expect(recommendation).toEqual(
        expect.objectContaining({
          recipeId: expect.any(String),
          recipe: expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
          }),
          matchCount: expect.any(Number),
          totalIngredients: expect.any(Number),
          expiringMatchCount: expect.any(Number),
          matchedIngredients: expect.any(Array),
        }),
      );
    });

    it('should return matched ingredients with expiry info', async () => {
      const res = await request(app.getHttpServer())
        .get('/recipes/me/recommendations')
        .expect(200);

      const matchedIngredients = res.body.data[0].matchedIngredients;
      expect(matchedIngredients).toHaveLength(2);

      const expiringItem = matchedIngredients.find(
        (i: any) => i.isExpiringSoon === true,
      );
      expect(expiringItem).toBeDefined();
      expect(expiringItem.daysUntilExpiry).toBe(3);
    });

    it('should return empty data when no pantry items', async () => {
      mockRecommendationsService.getRecommendations.mockResolvedValueOnce({
        data: [],
        expiringItemsCount: 0,
        totalPantryItems: 0,
      });

      const res = await request(app.getHttpServer())
        .get('/recipes/me/recommendations')
        .expect(200);

      expect(res.body.data).toHaveLength(0);
      expect(res.body.totalPantryItems).toBe(0);
    });
  });
});
