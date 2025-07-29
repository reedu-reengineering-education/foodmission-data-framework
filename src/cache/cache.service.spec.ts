import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { LoggingService } from '../common/logging/logging.service';

// Mock cache manager
const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  reset: jest.fn(),
  wrap: jest.fn(),
};

describe('CacheService', () => {
  let service: CacheService;
  let loggingService: LoggingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: LoggingService,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    loggingService = module.get<LoggingService>(LoggingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return value when key exists', async () => {
      const testData = { id: 1, name: 'test' };
      mockCacheManager.get.mockResolvedValue(testData);

      const result = await service.get('test-key');

      expect(result).toEqual(testData);
      expect(mockCacheManager.get).toHaveBeenCalledWith('test-key');
      expect(loggingService.debug).toHaveBeenCalledWith('Cache hit for key: test-key');
    });

    it('should return undefined when key does not exist', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get('non-existent-key');

      expect(result).toBeUndefined();
      expect(loggingService.debug).toHaveBeenCalledWith('Cache miss for key: non-existent-key');
    });

    it('should handle errors gracefully', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.get('error-key');

      expect(result).toBeUndefined();
      expect(loggingService.error).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      const testData = { id: 1, name: 'test' };
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set('test-key', testData);

      expect(mockCacheManager.set).toHaveBeenCalledWith('test-key', testData, undefined);
      expect(loggingService.debug).toHaveBeenCalledWith('Cache set for key: test-key, TTL: default');
    });

    it('should set value with TTL', async () => {
      const testData = { id: 1, name: 'test' };
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set('test-key', testData, 300);

      expect(mockCacheManager.set).toHaveBeenCalledWith('test-key', testData, 300000); // TTL in ms
      expect(loggingService.debug).toHaveBeenCalledWith('Cache set for key: test-key, TTL: 300');
    });
  });

  describe('del', () => {
    it('should delete single key', async () => {
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.del('test-key');

      expect(mockCacheManager.del).toHaveBeenCalledWith('test-key');
      expect(loggingService.debug).toHaveBeenCalledWith('Cache deleted for key: test-key');
    });
  });

  describe('delMany', () => {
    it('should delete multiple keys', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.delMany(keys);

      expect(mockCacheManager.del).toHaveBeenCalledTimes(3);
      expect(loggingService.debug).toHaveBeenCalledWith('Cache deleted for keys: key1, key2, key3');
    });

    it('should handle empty keys array', async () => {
      await service.delMany([]);

      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const testData = { id: 1, name: 'test' };
      mockCacheManager.get.mockResolvedValue(testData);

      const factory = jest.fn();
      const result = await service.getOrSet('test-key', factory);

      expect(result).toEqual(testData);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should execute factory and cache result if not exists', async () => {
      const testData = { id: 1, name: 'test' };
      mockCacheManager.get.mockResolvedValue(undefined);
      mockCacheManager.set.mockResolvedValue(undefined);

      const factory = jest.fn().mockResolvedValue(testData);
      const result = await service.getOrSet('test-key', factory);

      expect(result).toEqual(testData);
      expect(factory).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith('test-key', testData, undefined);
    });
  });

  describe('generateKey', () => {
    it('should generate key with prefix and parts', () => {
      const key = service.generateKey('users', 'profile', 123);
      expect(key).toBe('users:profile:123');
    });
  });

  describe('getStats', () => {
    it('should return cache statistics when connected', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);
      mockCacheManager.get.mockResolvedValue('ok');
      mockCacheManager.del.mockResolvedValue(undefined);

      const stats = await service.getStats();

      expect(stats).toEqual({
        connected: true,
        keyCount: undefined,
        memoryUsage: undefined,
      });
    });

    it('should handle disconnected state', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Connection error'));

      const stats = await service.getStats();

      expect(stats).toEqual({
        connected: false,
      });
    });
  });
});