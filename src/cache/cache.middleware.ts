import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LoggingService } from '../common/logging/logging.service';

@Injectable()
export class CacheMiddleware implements NestMiddleware {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly logger: LoggingService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for certain paths
    const skipPaths = ['/health', '/metrics', '/api-docs'];
    if (skipPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    const cacheKey = this.generateCacheKey(req);

    try {
      // Try to get cached response
      const cachedResponse = await this.cache.get(cacheKey);
      if (cachedResponse) {
        this.logger.debug(`Serving cached response for ${req.path}`);
        res.set('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      // Intercept the response
      const originalSend = res.json;
      res.json = (body: any) => {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cache for 5 minutes by default
          const ttl = req.headers['cache-control']
            ? this.parseCacheControl(req.headers['cache-control'])
            : 300;

          if (ttl > 0) {
            const ttlMs = ttl * 1000; // Convert to milliseconds
            self.cache.set(cacheKey, body, ttlMs).catch((err) => {
              self.logger.error('Error caching response:', err);
            });
          }
        }

        res.set('X-Cache', 'MISS');
        return originalSend.call(this, body);
      };
    } catch (error) {
      this.logger.error('Cache middleware error:', error);
    }

    next();
  }

  private generateCacheKey(req: Request): string {
    const userId = (req as any).user?.id || 'anonymous';
    const queryString = new URLSearchParams(req.query as any).toString();
    const baseKey = `api:${req.path}:${userId}`;

    return queryString
      ? `${baseKey}:${Buffer.from(queryString).toString('base64')}`
      : baseKey;
  }

  private parseCacheControl(cacheControl: string): number {
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    return maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 300;
  }
}
