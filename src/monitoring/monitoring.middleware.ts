import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';
import {
  getRequestUrl,
  shouldSkipObservabilityRoute,
} from '../common/utils/observability-route-filter';

@Injectable()
export class MonitoringMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestUrl = getRequestUrl(req);
    if (shouldSkipObservabilityRoute(requestUrl, req.get('User-Agent') || '')) {
      next();
      return;
    }

    const startHrTime = process.hrtime();

    // Extract route pattern for metrics (remove dynamic segments)
    const route = this.extractRoutePattern(req);

    // Capture response metrics when response finishes
    res.once('finish', () => {
      const hrDuration = process.hrtime(startHrTime);
      const durationInSeconds = hrDuration[0] + hrDuration[1] / 1e9;

      // Record metrics
      this.metricsService.recordHttpRequest(
        req.method,
        route,
        res.statusCode,
        durationInSeconds,
      );
    });

    next();
  }

  /**
   * Extract route pattern from request for consistent metrics
   * Converts /api/food-products/123 to /api/food-products/:id
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
