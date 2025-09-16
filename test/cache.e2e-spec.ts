import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from '../src/cache/cache.service';
import { CacheModule } from '../src/cache/cache.module';
import { CommonModule } from '../src/common/common.module';

describe('Cache E2E', () => {
  let cacheService: CacheService;
  let cacheManager: any;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    // Create a minimal test module focused on cache functionality
    moduleFixture = await Test.createTestingModule({
      imports: [CommonModule, CacheModule],
    }).compile();

    cacheService = moduleFixture.get<CacheService>(CacheService);
    cacheManager = moduleFixture.get(CACHE_MANAGER);
  });

  afterAll(async () => {
    if (moduleFixture) {
      await moduleFixture.close();
    }
  });

  beforeEach(async () => {
    // Clear cache before each test
    if (cacheManager && cacheManager.reset) {
      await cacheManager.reset();
    }
  });

  describe('Cache Service', () => {
    it('should set and get values from cache', async () => {
      const key = 'test-key';
      const value = { data: 'test-value', timestamp: Date.now() };

      // Set value in cache
      await cacheService.set(key, value, 60); // 60 seconds TTL

      // Get value from cache
      const cachedValue = await cacheService.get(key);
      expect(cachedValue).toEqual(value);
    });

    it('should return undefined for non-existent keys', async () => {
      const result = await cacheService.get('non-existent-key');
      expect(result).toBeUndefined();
    });

    it('should delete values from cache', async () => {
      const key = 'delete-test-key';
      const value = 'delete-test-value';

      // Set value
      await cacheService.set(key, value);

      // Verify it exists
      let cachedValue = await cacheService.get(key);
      expect(cachedValue).toBe(value);

      // Delete it
      await cacheService.del(key);

      // Verify it's gone
      cachedValue = await cacheService.get(key);
      expect(cachedValue).toBeUndefined();
    });

    it('should delete multiple keys from cache', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const value = 'test-value';

      // Set multiple values
      for (const key of keys) {
        await cacheService.set(key, value);
      }

      // Verify they exist
      for (const key of keys) {
        const cachedValue = await cacheService.get(key);
        expect(cachedValue).toBe(value);
      }

      // Delete all
      await cacheService.delMany(keys);

      // Verify they're gone
      for (const key of keys) {
        const cachedValue = await cacheService.get(key);
        expect(cachedValue).toBeUndefined();
      }
    });

    it('should clear all cache', async () => {
      // Set multiple values
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      await cacheService.set('key3', 'value3');

      // Clear all cache
      await cacheService.reset();

      // Verify all are gone
      expect(await cacheService.get('key1')).toBeUndefined();
      expect(await cacheService.get('key2')).toBeUndefined();
      expect(await cacheService.get('key3')).toBeUndefined();
    });

    it('should use getOrSet pattern', async () => {
      const key = 'getOrSet-key';
      const value = 'computed-value';

      const factory = jest.fn(() => Promise.resolve(value));

      // First call should execute factory
      const result1 = await cacheService.getOrSet(key, factory, 60);
      expect(result1).toBe(value);
      expect(factory).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await cacheService.getOrSet(key, factory, 60);
      expect(result2).toBe(value);
      expect(factory).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should generate cache keys correctly', () => {
      const key1 = cacheService.generateKey('food', '123');
      expect(key1).toBe('food:123');

      const key2 = cacheService.generateKey('user', 'abc', 'profile');
      expect(key2).toBe('user:abc:profile');

      const key3 = cacheService.generateKey('list', 'foods', 1, 10);
      expect(key3).toBe('list:foods:1:10');
    });

    it('should generate invalidation keys correctly', () => {
      const keys1 = cacheService.generateInvalidationKeys('food');
      expect(keys1).toEqual(['food:list', 'food:count']);

      const keys2 = cacheService.generateInvalidationKeys('food', '123');
      expect(keys2).toEqual(['food:list', 'food:count', 'food:123']);
    });

    it('should wrap functions with caching', async () => {
      const key = 'wrap-key';
      const value = 'wrapped-value';

      const fn = jest.fn(() => Promise.resolve(value));

      // First call should execute function
      const result1 = await cacheService.wrap(key, fn, 60);
      expect(result1).toBe(value);
      expect(fn).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await cacheService.wrap(key, fn, 60);
      expect(result2).toBe(value);
      expect(fn).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should check cache availability', async () => {
      const isAvailable = await cacheService.isAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should get cache stats', async () => {
      const stats = await cacheService.getStats();
      expect(stats).toHaveProperty('connected');
      expect(typeof stats.connected).toBe('boolean');
    });
  });

  describe('Cache Manager Direct Access', () => {
    it('should allow direct cache manager access', async () => {
      const key = 'direct-access-key';
      const value = 'direct-access-value';

      // Set using cache manager directly
      await cacheManager.set(key, value, 60000); // 60 seconds in ms

      // Get using cache manager directly
      const cachedValue = await cacheManager.get(key);
      expect(cachedValue).toBe(value);

      // Delete using cache manager directly
      await cacheManager.del(key);

      // Verify it's gone
      const deletedValue = await cacheManager.get(key);
      expect(deletedValue).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle cache errors gracefully', async () => {
      // Mock cache error
      const originalGet = cacheManager.get;
      cacheManager.get = jest.fn().mockRejectedValue(new Error('Cache error'));

      // Should not throw, should return undefined
      const result = await cacheService.get('error-key');
      expect(result).toBeUndefined();

      // Restore original method
      cacheManager.get = originalGet;
    });

    it('should handle set errors gracefully', async () => {
      // Mock cache error
      const originalSet = cacheManager.set;
      cacheManager.set = jest
        .fn()
        .mockRejectedValue(new Error('Cache set error'));

      // Should not throw
      await expect(
        cacheService.set('error-key', 'value'),
      ).resolves.not.toThrow();

      // Restore original method
      cacheManager.set = originalSet;
    });

    it('should handle wrap errors gracefully', async () => {
      // Mock cache error
      const originalWrap = cacheManager.wrap;
      cacheManager.wrap = jest
        .fn()
        .mockRejectedValue(new Error('Cache wrap error'));

      const fn = jest.fn<Promise<string>, []>(() =>
        Promise.resolve('fallback-value'),
      );

      // Should fallback to executing the function directly
      const result = await cacheService.wrap('error-key', fn);
      expect(result).toBe('fallback-value');
      expect(fn).toHaveBeenCalledTimes(1);

      // Restore original method
      cacheManager.wrap = originalWrap;
    });
  });
});
