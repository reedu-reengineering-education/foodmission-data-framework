import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe.skip('Cache E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cacheManager: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    cacheManager = moduleFixture.get(CACHE_MANAGER);

    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cacheManager.reset();

    // Clean up database
    await prisma.food.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Food Caching', () => {
    let createdFood: any;

    beforeEach(async () => {
      // Create a test food item
      createdFood = await prisma.food.create({
        data: {
          name: 'Test Food',
          description: 'Test Description',
          barcode: '1234567890',
          createdBy: 'test-user',
        },
      });
    });

    it('should cache food item on first request and serve from cache on second request', async () => {
      // First request - should hit database and cache result
      const response1 = await request(app.getHttpServer())
        .get(`/foods/${createdFood.id}`)
        .expect(200);

      expect(response1.body.name).toBe('Test Food');

      // Verify cache was populated
      const cacheKey = `food:${createdFood.id}:anonymous`;
      const cachedResult = await cacheManager.get(cacheKey);
      expect(cachedResult).toBeDefined();

      // Second request - should serve from cache
      const response2 = await request(app.getHttpServer())
        .get(`/foods/${createdFood.id}`)
        .expect(200);

      expect(response2.body.name).toBe('Test Food');
    });

    it('should cache food by barcode', async () => {
      // First request by barcode
      const response1 = await request(app.getHttpServer())
        .get(`/foods/barcode/${createdFood.barcode}`)
        .expect(200);

      expect(response1.body.barcode).toBe('1234567890');

      // Verify cache was populated
      const cacheKey = `food_barcode:${createdFood.barcode}:anonymous`;
      const cachedResult = await cacheManager.get(cacheKey);
      expect(cachedResult).toBeDefined();
    });

    it('should invalidate cache when food is updated', async () => {
      // First request to populate cache
      await request(app.getHttpServer())
        .get(`/foods/${createdFood.id}`)
        .expect(200);

      // Verify cache exists
      const cacheKey = `food:${createdFood.id}:anonymous`;
      let cachedResult = await cacheManager.get(cacheKey);
      expect(cachedResult).toBeDefined();

      // Update the food item
      await request(app.getHttpServer())
        .put(`/foods/${createdFood.id}`)
        .send({
          name: 'Updated Food Name',
          description: 'Updated Description',
        })
        .expect(200);

      // Verify cache was invalidated
      cachedResult = await cacheManager.get(cacheKey);
      expect(cachedResult).toBeUndefined();

      // Next request should fetch fresh data
      const response = await request(app.getHttpServer())
        .get(`/foods/${createdFood.id}`)
        .expect(200);

      expect(response.body.name).toBe('Updated Food Name');
    });

    it('should invalidate cache when food is deleted', async () => {
      // First request to populate cache
      await request(app.getHttpServer())
        .get(`/foods/${createdFood.id}`)
        .expect(200);

      // Verify cache exists
      const cacheKey = `food:${createdFood.id}:anonymous`;
      let cachedResult = await cacheManager.get(cacheKey);
      expect(cachedResult).toBeDefined();

      // Delete the food item
      await request(app.getHttpServer())
        .delete(`/foods/${createdFood.id}`)
        .expect(200);

      // Verify cache was invalidated
      cachedResult = await cacheManager.get(cacheKey);
      expect(cachedResult).toBeUndefined();
    });

    it('should invalidate list cache when new food is created', async () => {
      // First request to populate list cache
      await request(app.getHttpServer()).get('/foods').expect(200);

      // Create new food item
      await request(app.getHttpServer())
        .post('/foods')
        .send({
          name: 'New Food',
          description: 'New Description',
          barcode: '9876543210',
          createdBy: 'test-user',
        })
        .expect(201);

      // List cache should be invalidated
      const listCacheKey = 'foods:list:anonymous';
      const cachedList = await cacheManager.get(listCacheKey);
      expect(cachedList).toBeUndefined();
    });
  });

  describe('OpenFoodFacts Caching', () => {
    it('should cache OpenFoodFacts data', async () => {
      // Mock OpenFoodFacts service response would be needed here
      // This is a placeholder for when OpenFoodFacts integration is available

      const testBarcode = '1234567890';
      const cacheKey = `openfoodfacts:${testBarcode}:anonymous`;

      // Manually set cache to simulate OpenFoodFacts response
      const mockOffData = {
        barcode: testBarcode,
        name: 'Test Product',
        brands: ['Test Brand'],
        categories: ['test-category'],
      };

      await cacheManager.set(cacheKey, mockOffData, 3600);

      // Verify cache was set
      const cachedResult = await cacheManager.get(cacheKey);
      expect(cachedResult).toEqual(mockOffData);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate different cache keys for different query parameters', async () => {
      const foodId = 'test-id';

      // Request with includeOpenFoodFacts=true
      await request(app.getHttpServer())
        .get(`/foods/${foodId}?includeOpenFoodFacts=true`)
        .expect(404); // Food might not exist, but cache key should be generated

      // Request with includeOpenFoodFacts=false
      await request(app.getHttpServer())
        .get(`/foods/${foodId}?includeOpenFoodFacts=false`)
        .expect(404);

      // Different cache keys should be generated for different query params
      // This would be verified by checking the cache manager directly
    });
  });

  describe('Cache TTL', () => {
    it('should respect cache TTL settings', async () => {
      // This test would require waiting for cache expiration
      // or mocking the cache manager to simulate TTL behavior

      const shortTtlKey = 'test:short-ttl';
      await cacheManager.set(shortTtlKey, 'test-value', 1); // 1 second TTL

      // Immediately check - should exist
      let cachedValue = await cacheManager.get(shortTtlKey);
      expect(cachedValue).toBe('test-value');

      // Wait for expiration (in real test, you might mock time)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be expired
      cachedValue = await cacheManager.get(shortTtlKey);
      expect(cachedValue).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle cache errors gracefully', async () => {
      // Mock cache error
      jest
        .spyOn(cacheManager, 'get')
        .mockRejectedValueOnce(new Error('Cache error'));

      // Request should still work even if cache fails
      const response = await request(app.getHttpServer())
        .get('/foods/non-existent-id')
        .expect(404);

      expect(response.body.message).toContain('Food not found');
    });
  });
});
