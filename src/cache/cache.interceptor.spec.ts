import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { of } from 'rxjs';
import { CacheInterceptor } from './cache.interceptor';
import { LoggingService } from '../common/logging/logging.service';

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;
  let cacheManager: jest.Mocked<any>;
  let reflector: jest.Mocked<Reflector>;
  let loggingService: jest.Mocked<LoggingService>;

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockLoggingService = {
      debug: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInterceptor,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
      ],
    }).compile();

    interceptor = module.get<CacheInterceptor>(CacheInterceptor);
    cacheManager = module.get(CACHE_MANAGER);
    reflector = module.get(Reflector);
    loggingService = module.get(LoggingService);
  });

  const createMockExecutionContext = (
    method = 'GET',
    query = {},
    user: any = null,
    params = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          query,
          user,
          params,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  const createMockCallHandler = (returnValue: any): CallHandler => {
    return {
      handle: () => of(returnValue),
    };
  };

  describe('intercept', () => {
    it('should skip caching for non-GET requests', async () => {
      const context = createMockExecutionContext('POST', {}, null, {});
      const next = createMockCallHandler('result');

      reflector.getAllAndOverride.mockReturnValue('test-key');

      const result = await interceptor.intercept(context, next);

      expect(result).toBeDefined();
      expect(cacheManager.get).not.toHaveBeenCalled();
    });

    it('should skip caching when no cache key is provided', async () => {
      const context = createMockExecutionContext('GET', {}, null, {});
      const next = createMockCallHandler('result');

      reflector.getAllAndOverride.mockReturnValue(null);

      const result = await interceptor.intercept(context, next);

      expect(result).toBeDefined();
      expect(cacheManager.get).not.toHaveBeenCalled();
    });

    it('should return cached result when cache hit occurs', async () => {
      const context = createMockExecutionContext('GET', {}, { id: 'user123' }, {});
      const next = createMockCallHandler('fresh-result');
      const cachedResult = 'cached-result';

      reflector.getAllAndOverride
        .mockReturnValueOnce('test-key') // cache key
        .mockReturnValueOnce(300); // TTL

      cacheManager.get.mockResolvedValue(cachedResult);

      const result = await interceptor.intercept(context, next);
      const observableResult = await result.toPromise();

      expect(observableResult).toBe(cachedResult);
      expect(cacheManager.get).toHaveBeenCalledWith('test-key:user123');
      expect(loggingService.debug).toHaveBeenCalledWith(
        'Serving cached response for key: test-key:user123',
      );
    });

    it('should cache result when cache miss occurs', async () => {
      const context = createMockExecutionContext('GET', {}, { id: 'user123' }, {});
      const freshResult = 'fresh-result';
      const next = createMockCallHandler(freshResult);

      reflector.getAllAndOverride
        .mockReturnValueOnce('test-key') // cache key
        .mockReturnValueOnce(300); // TTL

      cacheManager.get.mockResolvedValue(undefined);

      const result = await interceptor.intercept(context, next);
      const observableResult = await result.toPromise();

      expect(observableResult).toBe(freshResult);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'test-key:user123',
        freshResult,
        300000,
      );
      expect(loggingService.debug).toHaveBeenCalledWith(
        'Cached response for key: test-key:user123',
      );
    });

    it('should generate cache key with query parameters', async () => {
      const context = createMockExecutionContext(
        'GET',
        { page: '1', limit: '10' },
        { id: 'user123' },
        {},
      );
      const next = createMockCallHandler('result');

      reflector.getAllAndOverride
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(300);

      cacheManager.get.mockResolvedValue(undefined);

      await interceptor.intercept(context, next);

      const expectedKey =
        'test-key:user123:' + Buffer.from('page=1&limit=10').toString('base64');
      expect(cacheManager.get).toHaveBeenCalledWith(expectedKey);
    });

    it('should generate cache key with route parameters', async () => {
      const context = createMockExecutionContext(
        'GET',
        {},
        { id: 'user123' },
        { id: 'food-1' },
      );
      const next = createMockCallHandler('result');

      reflector.getAllAndOverride
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(300);

      cacheManager.get.mockResolvedValue(undefined);

      await interceptor.intercept(context, next);

      expect(cacheManager.get).toHaveBeenCalledWith('test-key:user123:id:food-1');
    });

    it('should generate cache key with both route and query parameters', async () => {
      const context = createMockExecutionContext(
        'GET',
        { includeOpenFoodFacts: 'true' },
        { id: 'user123' },
        { id: 'food-1' },
      );
      const next = createMockCallHandler('result');

      reflector.getAllAndOverride
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(300);

      cacheManager.get.mockResolvedValue(undefined);

      await interceptor.intercept(context, next);

      const queryString = Buffer.from('includeOpenFoodFacts=true').toString('base64');
      const expectedKey = `test-key:user123:id:food-1:${queryString}`;
      expect(cacheManager.get).toHaveBeenCalledWith(expectedKey);
    });

    it('should generate different cache keys for different route parameters', async () => {
      const context1 = createMockExecutionContext(
        'GET',
        { includeOpenFoodFacts: 'true' },
        { id: 'user123' },
        { id: 'food-1' },
      );
      const context2 = createMockExecutionContext(
        'GET',
        { includeOpenFoodFacts: 'true' },
        { id: 'user123' },
        { id: 'food-2' },
      );
      const next1 = createMockCallHandler('result');
      const next2 = createMockCallHandler('result');

      reflector.getAllAndOverride
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(300)
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(300);

      cacheManager.get.mockResolvedValue(undefined);

      await interceptor.intercept(context1, next1);
      await interceptor.intercept(context2, next2);

      const queryString = Buffer.from('includeOpenFoodFacts=true').toString('base64');
      expect(cacheManager.get).toHaveBeenCalledWith(`test-key:user123:id:food-1:${queryString}`);
      expect(cacheManager.get).toHaveBeenCalledWith(`test-key:user123:id:food-2:${queryString}`);
    });

    it('should generate different cache keys for different query parameters', async () => {
      const context1 = createMockExecutionContext(
        'GET',
        { includeOpenFoodFacts: 'true' },
        { id: 'user123' },
        { id: 'food-1' },
      );
      const context2 = createMockExecutionContext(
        'GET',
        { includeOpenFoodFacts: 'false' },
        { id: 'user123' },
        { id: 'food-1' },
      );
      const next1 = createMockCallHandler('result');
      const next2 = createMockCallHandler('result');

      reflector.getAllAndOverride
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(300)
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(300);

      cacheManager.get.mockResolvedValue(undefined);

      await interceptor.intercept(context1, next1);
      await interceptor.intercept(context2, next2);

      const queryString1 = Buffer.from('includeOpenFoodFacts=true').toString('base64');
      const queryString2 = Buffer.from('includeOpenFoodFacts=false').toString('base64');
      expect(cacheManager.get).toHaveBeenCalledWith(`test-key:user123:id:food-1:${queryString1}`);
      expect(cacheManager.get).toHaveBeenCalledWith(`test-key:user123:id:food-1:${queryString2}`);
    });

    it('should handle anonymous users', async () => {
      const context = createMockExecutionContext('GET', {}, null, {});
      const next = createMockCallHandler('result');

      reflector.getAllAndOverride
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(300);

      cacheManager.get.mockResolvedValue(undefined);

      await interceptor.intercept(context, next);

      expect(cacheManager.get).toHaveBeenCalledWith('test-key:anonymous');
    });

    it('should not cache responses with errors', async () => {
      const context = createMockExecutionContext('GET', {}, { id: 'user123' }, {});
      const errorResult = { error: 'Something went wrong' };
      const next = createMockCallHandler(errorResult);

      reflector.getAllAndOverride
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(300);

      cacheManager.get.mockResolvedValue(undefined);

      const result = await interceptor.intercept(context, next);
      await result.toPromise();

      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      const context = createMockExecutionContext('GET', {}, { id: 'user123' }, {});
      const next = createMockCallHandler('result');

      reflector.getAllAndOverride
        .mockReturnValueOnce('test-key')
        .mockReturnValueOnce(300);

      cacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await interceptor.intercept(context, next);
      const observableResult = await result.toPromise();

      expect(observableResult).toBe('result');
      expect(loggingService.error).toHaveBeenCalledWith(
        'Cache interceptor error for key test-key:user123:',
        expect.any(Error),
      );
    });
  });
});
