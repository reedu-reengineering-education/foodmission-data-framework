import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';
import { LoggingService } from '../common/logging/logging.service';

@Injectable()
export class MonitoringMiddleware implements NestMiddleware {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly loggingService: LoggingService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const startHrTime = process.hrtime();

    // Extract route pattern for metrics (remove dynamic segments)
    const route = this.extractRoutePattern(req);

    // Log request start
    this.loggingService.http(req.url, {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      route,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    // Capture response metrics when response finishes
    res.on('finish', () => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // Convert to seconds
      const hrDuration = process.hrtime(startHrTime);
      const durationInSeconds = hrDuration[0] + hrDuration[1] / 1e9;

      // Record metrics
      this.metricsService.recordHttpRequest(
        req.method,
        route,
        res.statusCode,
        durationInSeconds,
      );

      // Log response
      this.loggingService.http(
        `${req.method} ${route} ${res.statusCode} - ${duration}ms`,
        {
          statusCode: res.statusCode,
          duration: duration,
          contentLength: res.get('Content-Length'),
          method: req.method,
          route: route,
        },
      );
    });

    next();
  }

  /**
   * Extract route pattern from request for consistent metrics
   * Converts /api/foods/123 to /api/foods/:id
   */
  private extractRoutePattern(req: Request): string {
    // If route is available from NestJS routing
    if (req.route?.path) {
      return req.route.path;
    }

    // Fallback: try to normalize common patterns
    let route = req.path;

    // Replace UUIDs and numeric IDs with parameter placeholders
    route = route.replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/:id',
    );
    route = route.replace(/\/\d+/g, '/:id');

    // Replace other common patterns
    route = route.replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:token');

    return route || req.path;
  }
}
