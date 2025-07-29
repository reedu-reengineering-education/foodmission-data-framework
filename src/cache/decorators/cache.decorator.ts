import { SetMetadata } from '@nestjs/common';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '../cache.interceptor';

/**
 * Decorator to enable caching for a controller method
 * @param key - Cache key prefix
 * @param ttl - Time to live in seconds (optional)
 */
export const Cacheable = (key: string, ttl?: number) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, key)(target, propertyKey, descriptor);
    if (ttl) {
      SetMetadata(CACHE_TTL_METADATA, ttl)(target, propertyKey, descriptor);
    }
  };
};

/**
 * Decorator to set cache TTL
 * @param ttl - Time to live in seconds
 */
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);

/**
 * Decorator to set cache key
 * @param key - Cache key prefix
 */
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);
