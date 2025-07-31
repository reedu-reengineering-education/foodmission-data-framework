import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LoggingService } from '../common/logging/logging.service';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly reflector: Reflector,
    private readonly logger: LoggingService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Get cache configuration from decorators
    const cacheKey = this.reflector.getAllAndOverride<string>(
      CACHE_KEY_METADATA,
      [handler, controller],
    );

    const cacheTTL = this.reflector.getAllAndOverride<number>(
      CACHE_TTL_METADATA,
      [handler, controller],
    );

    if (!cacheKey) {
      return next.handle();
    }

    // Generate full cache key including query parameters
    const fullCacheKey = this.generateCacheKey(cacheKey, request);

    try {
      // Try to get from cache
      const cachedResult = await this.cacheManager.get(fullCacheKey);
      if (cachedResult !== undefined) {
        this.logger.debug(`Serving cached response for key: ${fullCacheKey}`);
        return of(cachedResult);
      }

      // Execute handler and cache result
      return next.handle().pipe(
        tap((response) => {
          if (response && !response.error) {
            const ttlMs = cacheTTL ? cacheTTL * 1000 : undefined;
            void this.cacheManager.set(fullCacheKey, response, ttlMs);
            this.logger.debug(`Cached response for key: ${fullCacheKey}`);
          }
        }),
      );
    } catch (error) {
      this.logger.error(
        `Cache interceptor error for key ${fullCacheKey}:`,
        error,
      );
      return next.handle();
    }
  }

  private generateCacheKey(baseKey: string, request: any): string {
    const queryString = new URLSearchParams(request.query).toString();
    const userId = request.user?.id || 'anonymous';

    return queryString
      ? `${baseKey}:${userId}:${Buffer.from(queryString).toString('base64')}`
      : `${baseKey}:${userId}`;
  }
}
