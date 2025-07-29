import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LoggingService } from '../common/logging/logging.service';

export interface CacheOptions {
  ttl?: number;
  key?: string;
}

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined) {
        this.logger.debug(`Cache hit for key: ${key}`);
      } else {
        this.logger.debug(`Cache miss for key: ${key}`);
      }
      return value as T;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const ttlMs = ttl ? ttl * 1000 : undefined; // Convert to milliseconds
      await this.cacheManager.set(key, value, ttlMs);
      this.logger.debug(`Cache set for key: ${key}, TTL: ${ttl || 'default'}`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys from cache
   */
  async delMany(keys: string[]): Promise<void> {
    try {
      await Promise.all(keys.map((key) => this.cacheManager.del(key)));
      this.logger.debug(`Cache deleted for keys: ${keys.join(', ')}`);
    } catch (error) {
      this.logger.error(
        `Cache delete many error for keys ${keys.join(', ')}:`,
        error,
      );
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.clear();
      this.logger.debug('Cache cleared');
    } catch (error) {
      this.logger.error('Cache reset error:', error);
    }
  }

  /**
   * Get or set pattern - if key exists return it, otherwise execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  /**
   * Generate cache keys for invalidation patterns
   */
  generateInvalidationKeys(pattern: string, id?: string): string[] {
    const keys = [`${pattern}:list`, `${pattern}:count`];

    if (id) {
      keys.push(`${pattern}:${id}`);
    }

    return keys;
  }

  /**
   * Wrap a function with caching
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    try {
      const ttlMs = ttl ? ttl * 1000 : undefined;
      return await this.cacheManager.wrap(key, fn, ttlMs);
    } catch (error) {
      this.logger.error(`Cache wrap error for key ${key}:`, error);
      // Fallback to executing the function directly
      return await fn();
    }
  }

  /**
   * Get cache statistics (basic implementation)
   */
  async getStats(): Promise<{
    connected: boolean;
    keyCount?: number;
    memoryUsage?: string;
  }> {
    try {
      // Basic health check - try to set and get a test value
      const testKey = '__cache_health_check__';
      await this.cacheManager.set(testKey, 'ok', 1000);
      const testValue = await this.cacheManager.get(testKey);
      await this.cacheManager.del(testKey);

      return {
        connected: testValue === 'ok',
        keyCount: undefined, // Not easily available with cache-manager
        memoryUsage: undefined, // Not easily available with cache-manager
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return {
        connected: false,
      };
    }
  }

  /**
   * Check if cache is available
   */
  async isAvailable(): Promise<boolean> {
    const stats = await this.getStats();
    return stats.connected;
  }
}
