import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';
import {
  getRequestUrl,
  shouldSkipObservabilityRoute,
} from '../common/utils/observability-route-filter';

/** Route label for requests no controller route matched. */
export const UNMATCHED_ROUTE = 'unmatched';

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

    res.once('finish', () => {
      const hrDuration = process.hrtime(startHrTime);
      const durationInSeconds = hrDuration[0] + hrDuration[1] / 1e9;

      this.metricsService.recordHttpRequest(
        req.method,
        // Resolved on finish: Express only sets req.route once the router has
        // matched, which is after this middleware runs.
        this.extractRoutePattern(req),
        res.statusCode,
        durationInSeconds,
      );
    });

    next();
  }

  /**
   * Route template for the metrics label, e.g. `/api/v1/meal-logs/:id`.
   * Requests that never matched a route (404 probes, body-parser rejections)
   * share one label so scanner paths can't blow up label cardinality.
   */
  private extractRoutePattern(req: Request): string {
    const routePath = (req.route as { path?: unknown } | undefined)?.path;
    if (typeof routePath === 'string') {
      return `${req.baseUrl || ''}${routePath}`;
    }
    return UNMATCHED_ROUTE;
  }
}
