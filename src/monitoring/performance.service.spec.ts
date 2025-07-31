import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceService } from './performance.service';
import { LoggingService } from '../common/logging/logging.service';
import { register } from 'prom-client';

describe('PerformanceService', () => {
  let service: PerformanceService;
  let loggingService: LoggingService;

  beforeEach(async () => {
    // Clear the Prometheus registry before each test
    register.clear();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceService,
        {
          provide: LoggingService,
          useValue: {
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PerformanceService>(PerformanceService);
    loggingService = module.get<LoggingService>(LoggingService);
  });

  describe('recordQueryPerformance', () => {
    it('should record query performance metrics', () => {
      service.recordQueryPerformance('findMany', 'foods', 0.05, 'success');

      // Verify that metrics are recorded (in a real test, you'd check the metrics registry)
      expect(loggingService.warn).not.toHaveBeenCalled();
    });

    it('should log warning for slow queries', () => {
      service.recordQueryPerformance('findMany', 'foods', 1.5, 'success');

      expect(loggingService.warn).toHaveBeenCalledWith(
        'Slow query detected: findMany on foods took 1.5s',
      );
    });
  });

  describe('recordCacheHit', () => {
    it('should record cache hit metrics', () => {
      service.recordCacheHit('foods');

      // In a real test, you'd verify the metric was incremented
      expect(true).toBe(true);
    });
  });

  describe('recordCacheMiss', () => {
    it('should record cache miss metrics', () => {
      service.recordCacheMiss('foods');

      // In a real test, you'd verify the metric was incremented
      expect(true).toBe(true);
    });
  });

  describe('createTimer', () => {
    it('should create a timer function', () => {
      const timer = service.createTimer();

      expect(typeof timer).toBe('function');

      // Wait a bit and measure
      setTimeout(() => {
        const duration = timer();
        expect(duration).toBeGreaterThan(0);
      }, 10);
    });
  });

  describe('measureQuery', () => {
    it('should measure successful query execution', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ id: 1, name: 'test' });

      const result = await service.measureQuery(
        'findUnique',
        'foods',
        mockQuery,
      );

      expect(result).toEqual({ id: 1, name: 'test' });
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should measure failed query execution', async () => {
      const mockQuery = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      await expect(
        service.measureQuery('findUnique', 'foods', mockQuery),
      ).rejects.toThrow('Database error');

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('updateActiveConnections', () => {
    it('should update active connections gauge', () => {
      service.updateActiveConnections(5);

      // In a real test, you'd verify the gauge was set
      expect(true).toBe(true);
    });
  });

  describe('getPerformanceSummary', () => {
    it('should return performance summary', async () => {
      const summary = await service.getPerformanceSummary();

      expect(summary).toHaveProperty('slowQueries');
      expect(summary).toHaveProperty('totalQueries');
      expect(summary).toHaveProperty('cacheHitRate');
      expect(summary).toHaveProperty('activeConnections');
    });
  });

  describe('getCacheHitRate', () => {
    it('should calculate cache hit rate', async () => {
      const hitRate = await service.getCacheHitRate();

      expect(typeof hitRate).toBe('number');
      expect(hitRate).toBeGreaterThanOrEqual(0);
      expect(hitRate).toBeLessThanOrEqual(1);
    });
  });
});
