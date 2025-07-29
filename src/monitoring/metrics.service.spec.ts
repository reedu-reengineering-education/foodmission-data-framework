import { Test, TestingModule } from '@nestjs/testing';
import { register } from 'prom-client';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    // Clear registry before each test
    register.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    register.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordHttpRequest', () => {
    it('should record HTTP request metrics', async () => {
      service.recordHttpRequest('GET', '/api/foods', 200, 0.5);

      const metrics = await service.getMetrics();
      
      expect(metrics).toContain('http_requests_total{method="GET",route="/api/foods",status_code="200"} 1');
      expect(metrics).toContain('http_request_duration_seconds_count{method="GET",route="/api/foods",status_code="200"} 1');
    });

    it('should record multiple HTTP requests with different labels', async () => {
      service.recordHttpRequest('GET', '/api/foods', 200, 0.3);
      service.recordHttpRequest('POST', '/api/foods', 201, 0.8);
      service.recordHttpRequest('GET', '/api/foods', 404, 0.1);

      const metrics = await service.getMetrics();
      
      expect(metrics).toContain('http_requests_total{method="GET",route="/api/foods",status_code="200"} 1');
      expect(metrics).toContain('http_requests_total{method="POST",route="/api/foods",status_code="201"} 1');
      expect(metrics).toContain('http_requests_total{method="GET",route="/api/foods",status_code="404"} 1');
    });
  });

  describe('setActiveConnections', () => {
    it('should set active connections gauge', async () => {
      service.setActiveConnections(10);

      const metrics = await service.getMetrics();
      
      expect(metrics).toContain('active_connections 10');
    });

    it('should update active connections gauge', async () => {
      service.setActiveConnections(5);
      service.setActiveConnections(15);

      const metrics = await service.getMetrics();
      
      expect(metrics).toContain('active_connections 15');
    });
  });

  describe('setDatabaseConnections', () => {
    it('should set database connections gauge', async () => {
      service.setDatabaseConnections(3);

      const metrics = await service.getMetrics();
      
      expect(metrics).toContain('database_connections 3');
    });
  });

  describe('recordExternalApiCall', () => {
    it('should record external API call success', async () => {
      service.recordExternalApiCall('openfoodfacts', 'success');

      const metrics = await service.getMetrics();
      
      expect(metrics).toContain('external_api_calls_total{service="openfoodfacts",status="success"} 1');
    });

    it('should record external API call error', async () => {
      service.recordExternalApiCall('openfoodfacts', 'error');

      const metrics = await service.getMetrics();
      
      expect(metrics).toContain('external_api_calls_total{service="openfoodfacts",status="error"} 1');
    });

    it('should record multiple external API calls', async () => {
      service.recordExternalApiCall('openfoodfacts', 'success');
      service.recordExternalApiCall('openfoodfacts', 'success');
      service.recordExternalApiCall('openfoodfacts', 'error');

      const metrics = await service.getMetrics();
      
      expect(metrics).toContain('external_api_calls_total{service="openfoodfacts",status="success"} 2');
      expect(metrics).toContain('external_api_calls_total{service="openfoodfacts",status="error"} 1');
    });
  });

  describe('recordCacheHit', () => {
    it('should record cache hit', async () => {
      service.recordCacheHit('redis');

      const metrics = await service.getMetrics();
      
      expect(metrics).toContain('cache_hits_total{cache_type="redis"} 1');
    });
  });

  describe('recordCacheMiss', () => {
    it('should record cache miss', async () => {
      service.recordCacheMiss('redis');

      const metrics = await service.getMetrics();
      
      expect(metrics).toContain('cache_misses_total{cache_type="redis"} 1');
    });
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      service.recordHttpRequest('GET', '/api/test', 200, 0.1);
      service.setActiveConnections(5);

      const metrics = await service.getMetrics();
      
      expect(metrics).toContain('# HELP http_requests_total Total number of HTTP requests');
      expect(metrics).toContain('# TYPE http_requests_total counter');
      expect(metrics).toContain('# HELP active_connections Number of active connections');
      expect(metrics).toContain('# TYPE active_connections gauge');
    });

    it('should include default Node.js metrics', async () => {
      const metrics = await service.getMetrics();
      
      // Check for some common Node.js metrics
      expect(metrics).toContain('process_cpu_user_seconds_total');
      expect(metrics).toContain('process_resident_memory_bytes');
      expect(metrics).toContain('nodejs_heap_size_total_bytes');
    });
  });

  describe('getRegistry', () => {
    it('should return the metrics registry', () => {
      const registry = service.getRegistry();
      
      expect(registry).toBe(register);
    });
  });
});