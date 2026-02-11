import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { of, throwError } from 'rxjs';
import { CacheEvictInterceptor } from './cache-evict.interceptor';
import { LoggingService } from '../common/logging/logging.service';
import { createMockLoggingService } from '../common/testing';

describe('CacheEvictInterceptor', () => {
  let interceptor: CacheEvictInterceptor;
  let cacheManager: jest.Mocked<any>;
  let reflector: jest.Mocked<Reflector>;
  let loggingService: jest.Mocked<LoggingService>;

  beforeEach(async () => {
    const mockCacheManager = {
      del: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockLoggingService = createMockLoggingService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheEvictInterceptor,
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

    interceptor = module.get<CacheEvictInterceptor>(CacheEvictInterceptor);
    cacheManager = module.get(CACHE_MANAGER);
    reflector = module.get(Reflector);
    loggingService = module.get(LoggingService);
  });

  const createMockExecutionContext = (
    params = {},
    user: any = null,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          params,
          user,
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
    it('should skip eviction when no evict keys are provided', async () => {
      const context = createMockExecutionContext();
      const next = createMockCallHandler('result');

      reflector.getAllAndOverride.mockReturnValue(null);

      const result = interceptor.intercept(context, next);
      const observableResult = await result.toPromise();

      expect(observableResult).toBe('result');
      expect(cacheManager.del).not.toHaveBeenCalled();
    });

    it('should skip eviction when evict keys array is empty', async () => {
      const context = createMockExecutionContext();
      const next = createMockCallHandler('result');

      reflector.getAllAndOverride.mockReturnValue([]);

      const result = interceptor.intercept(context, next);
      const observableResult = await result.toPromise();

      expect(observableResult).toBe('result');
      expect(cacheManager.del).not.toHaveBeenCalled();
    });

    it('should evict cache keys after successful method execution', async () => {
      const context = createMockExecutionContext(
        { id: '123', barcode: '1234567890' },
        { id: 'user123', sub: 'keycloak123' },
      );
      const next = createMockCallHandler('success-result');

      reflector.getAllAndOverride.mockReturnValue([
        'food:{id}',
        'food_barcode:{barcode}',
        'foods:list',
      ]);

      const result = interceptor.intercept(context, next);
      const observableResult = await result.toPromise();

      expect(observableResult).toBe('success-result');
      expect(cacheManager.del).toHaveBeenCalledWith('food:123');
      expect(cacheManager.del).toHaveBeenCalledWith('food_barcode:1234567890');
      expect(cacheManager.del).toHaveBeenCalledWith('foods:list');

      expect(loggingService.debug).toHaveBeenCalledWith(
        'Evicted cache key: food:123',
      );
      expect(loggingService.debug).toHaveBeenCalledWith(
        'Evicted cache key: food_barcode:1234567890',
      );
      expect(loggingService.debug).toHaveBeenCalledWith(
        'Evicted cache key: foods:list',
      );
    });

    it('should not evict cache keys when method execution fails', async () => {
      const context = createMockExecutionContext({ id: '123' });
      const next = {
        handle: () => throwError(() => new Error('Method failed')),
      };

      reflector.getAllAndOverride.mockReturnValue(['food:{id}']);

      try {
        const result = interceptor.intercept(context, next);
        await result.toPromise();
      } catch {
        // Expected to throw
      }

      expect(cacheManager.del).not.toHaveBeenCalled();
    });

    it('should not evict cache keys when response contains error', async () => {
      const context = createMockExecutionContext({ id: '123' });
      const next = createMockCallHandler({ error: 'Something went wrong' });

      reflector.getAllAndOverride.mockReturnValue(['food:{id}']);

      const result = interceptor.intercept(context, next);
      await result.toPromise();

      expect(cacheManager.del).not.toHaveBeenCalled();
    });

    it('should replace placeholder patterns correctly', async () => {
      const context = createMockExecutionContext(
        { id: '123', barcode: '1234567890' },
        { id: 'user456', sub: 'keycloak789' },
      );
      const next = createMockCallHandler('result');

      reflector.getAllAndOverride.mockReturnValue([
        'food:{id}',
        'user_profile:{keycloakId}',
        'user_data:{userId}',
        'barcode:{barcode}',
      ]);

      const result = interceptor.intercept(context, next);
      await result.toPromise();

      expect(cacheManager.del).toHaveBeenCalledWith('food:123');
      expect(cacheManager.del).toHaveBeenCalledWith('user_profile:keycloak789');
      expect(cacheManager.del).toHaveBeenCalledWith('user_data:user456');
      expect(cacheManager.del).toHaveBeenCalledWith('barcode:1234567890');
    });

    it('should handle missing placeholder values gracefully', async () => {
      const context = createMockExecutionContext({}, null);
      const next = createMockCallHandler('result');

      reflector.getAllAndOverride.mockReturnValue([
        'food:{id}',
        'user_profile:{keycloakId}',
        'user_data:{userId}',
        'barcode:{barcode}',
      ]);

      const result = interceptor.intercept(context, next);
      await result.toPromise();

      expect(cacheManager.del).toHaveBeenCalledWith('food:');
      expect(cacheManager.del).toHaveBeenCalledWith('user_profile:');
      expect(cacheManager.del).toHaveBeenCalledWith('user_data:anonymous');
      expect(cacheManager.del).toHaveBeenCalledWith('barcode:');
    });

    it('should handle cache deletion errors gracefully', async () => {
      const context = createMockExecutionContext({ id: '123' });
      const next = createMockCallHandler('result');

      reflector.getAllAndOverride.mockReturnValue(['food:{id}']);
      cacheManager.del.mockRejectedValue(new Error('Cache deletion failed'));

      const result = interceptor.intercept(context, next);
      const observableResult = await result.toPromise();

      expect(observableResult).toBe('result');
      expect(loggingService.error).toHaveBeenCalledWith(
        'Error evicting cache key food:{id}:',
        expect.any(Error),
      );
    });

    it('should handle keys without placeholders', async () => {
      const context = createMockExecutionContext();
      const next = createMockCallHandler('result');

      reflector.getAllAndOverride.mockReturnValue([
        'foods:list',
        'foods:count',
        'static:key',
      ]);

      const result = interceptor.intercept(context, next);
      await result.toPromise();

      expect(cacheManager.del).toHaveBeenCalledWith('foods:list');
      expect(cacheManager.del).toHaveBeenCalledWith('foods:count');
      expect(cacheManager.del).toHaveBeenCalledWith('static:key');
    });
  });
});
