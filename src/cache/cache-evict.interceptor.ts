import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LoggingService } from '../common/logging/logging.service';

@Injectable()
export class CacheEvictInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly reflector: Reflector,
    private readonly logger: LoggingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const controller = context.getClass();
    const request = context.switchToHttp().getRequest();

    // Get cache eviction keys from decorator
    const evictKeys = this.reflector.getAllAndOverride<string[]>(
      'cache_evict_keys',
      [handler, controller],
    );

    if (!evictKeys || evictKeys.length === 0) {
      return next.handle();
    }

    // Execute the method first, then evict cache
    return next.handle().pipe(
      mergeMap(async (response) => {
        // Evict cache for all successful responses, including void (undefined) ones.
        // A void delete response is represented as undefined, which is falsy — do
        // NOT gate eviction on truthiness of the response.
        const hasError = response != null && response.error;
        if (!hasError) {
          await this.evictCacheKeys(evictKeys, request);
        }
        return response;
      }),
    );
  }

  private async evictCacheKeys(keys: string[], request: any): Promise<void> {
    for (const keyPattern of keys) {
      try {
        // Replace placeholders in key pattern with actual values
        const resolvedKeys = this.resolveKeyPatterns(keyPattern, request);
        for (const resolvedKey of resolvedKeys) {
          await this.cacheManager.del(resolvedKey);
          this.logger.debug(`Evicted cache key: ${resolvedKey}`);
        }
      } catch (error) {
        this.logger.error(`Error evicting cache key ${keyPattern}:`, error);
      }
    }
  }

  private resolveKeyPatterns(pattern: string, request: any): string[] {
    const userId = request.user?.id || 'anonymous';

    // Legacy format: pattern contains placeholders like {id}, {userId}, etc.
    if (pattern.includes('{')) {
      return [
        pattern
          .replace('{userId}', userId)
          .replace('{id}', request.params?.id || '')
          .replace('{barcode}', request.params?.barcode || '')
          .replace('{keycloakId}', request.user?.sub || ''),
      ];
    }

    // Base-key format: build the full key the same way CacheInterceptor does.
    // Public endpoints (e.g. GET /food-products/:id) may be cached under the
    // anonymous userId even when the caller who triggers eviction is authenticated.
    // Evict both the authenticated user's variant and the anonymous variant so
    // deletes always clear the cache regardless of how it was populated.
    const routeParams = request.params || {};
    const routeParamsString = Object.keys(routeParams)
      .sort()
      .map((key) => `${key}:${routeParams[key]}`)
      .join('|');

    const buildKey = (uid: string): string => {
      const parts = [pattern, uid];
      if (routeParamsString) parts.push(routeParamsString);
      return parts.join(':');
    };

    const resolvedKeys = [buildKey(userId)];
    if (userId !== 'anonymous') {
      resolvedKeys.push(buildKey('anonymous'));
    }
    return resolvedKeys;
  }
}
