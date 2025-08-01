import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
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

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
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
        if (response && !response.error) {
          await this.evictCacheKeys(evictKeys, request, response);
        }
        return response;
      }),
    );
  }

  private async evictCacheKeys(
    keys: string[],
    request: any,
    response: any,
  ): Promise<void> {
    for (const keyPattern of keys) {
      try {
        // Replace placeholders in key pattern with actual values
        const resolvedKey = this.resolveKeyPattern(
          keyPattern,
          request,
          response,
        );
        await this.cacheManager.del(resolvedKey);
        this.logger.debug(`Evicted cache key: ${resolvedKey}`);
      } catch (error) {
        this.logger.error(`Error evicting cache key ${keyPattern}:`, error);
      }
    }
  }

  private resolveKeyPattern(
    pattern: string,
    request: any,
    response: any,
  ): string {
    const userId = request.user?.id || 'anonymous';

    // Replace common placeholders
    return pattern
      .replace('{userId}', userId)
      .replace('{id}', request.params?.id || '')
      .replace('{barcode}', request.params?.barcode || '')
      .replace('{keycloakId}', request.user?.sub || '');
  }
}
