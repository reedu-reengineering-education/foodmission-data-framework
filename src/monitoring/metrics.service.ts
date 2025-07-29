import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly activeConnections: Gauge<string>;
  private readonly databaseConnections: Gauge<string>;
  private readonly externalApiCalls: Counter<string>;
  private readonly cacheHits: Counter<string>;
  private readonly cacheMisses: Counter<string>;

  constructor() {
    // Collect default Node.js metrics only if not already collected
    if (!register.getSingleMetric('process_cpu_user_seconds_total')) {
      collectDefaultMetrics({ register });
    }

    // HTTP request metrics
    this.httpRequestsTotal = this.getOrCreateCounter(
      'http_requests_total',
      'Total number of HTTP requests',
      ['method', 'route', 'status_code']
    );

    this.httpRequestDuration = this.getOrCreateHistogram(
      'http_request_duration_seconds',
      'Duration of HTTP requests in seconds',
      ['method', 'route', 'status_code'],
      [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    );

    // Connection metrics
    this.activeConnections = this.getOrCreateGauge(
      'active_connections',
      'Number of active connections',
      []
    );

    this.databaseConnections = this.getOrCreateGauge(
      'database_connections',
      'Number of active database connections',
      []
    );

    // External API metrics
    this.externalApiCalls = this.getOrCreateCounter(
      'external_api_calls_total',
      'Total number of external API calls',
      ['service', 'status']
    );

    // Cache metrics - use different names to avoid conflict with PerformanceService
    this.cacheHits = this.getOrCreateCounter(
      'application_cache_hits_total',
      'Total number of application cache hits',
      ['cache_type']
    );

    this.cacheMisses = this.getOrCreateCounter(
      'application_cache_misses_total',
      'Total number of application cache misses',
      ['cache_type']
    );
  }

  private getOrCreateCounter(name: string, help: string, labelNames: string[]): Counter<string> {
    const existingMetric = register.getSingleMetric(name);
    if (existingMetric && existingMetric instanceof Counter) {
      return existingMetric as Counter<string>;
    }
    
    return new Counter({
      name,
      help,
      labelNames,
      registers: [register],
    });
  }

  private getOrCreateHistogram(name: string, help: string, labelNames: string[], buckets: number[]): Histogram<string> {
    const existingMetric = register.getSingleMetric(name);
    if (existingMetric && existingMetric instanceof Histogram) {
      return existingMetric as Histogram<string>;
    }
    
    return new Histogram({
      name,
      help,
      labelNames,
      buckets,
      registers: [register],
    });
  }

  private getOrCreateGauge(name: string, help: string, labelNames: string[]): Gauge<string> {
    const existingMetric = register.getSingleMetric(name);
    if (existingMetric && existingMetric instanceof Gauge) {
      return existingMetric as Gauge<string>;
    }
    
    return new Gauge({
      name,
      help,
      labelNames,
      registers: [register],
    });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    const labels = { method, route, status_code: statusCode.toString() };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration);
  }

  /**
   * Set active connections count
   */
  setActiveConnections(count: number): void {
    this.activeConnections.set(count);
  }

  /**
   * Set database connections count
   */
  setDatabaseConnections(count: number): void {
    this.databaseConnections.set(count);
  }

  /**
   * Record external API call
   */
  recordExternalApiCall(service: string, status: 'success' | 'error'): void {
    this.externalApiCalls.inc({ service, status });
  }

  /**
   * Record cache hit
   */
  recordCacheHit(cacheType: string): void {
    this.cacheHits.inc({ cache_type: cacheType });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(cacheType: string): void {
    this.cacheMisses.inc({ cache_type: cacheType });
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Get metrics registry
   */
  getRegistry() {
    return register;
  }
}