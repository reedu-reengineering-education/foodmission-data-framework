import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';
import { LoggingService } from '../common/logging/logging.service';

export interface InvalidationStrategy {
  pattern: string;
  dependencies?: string[];
  ttl?: number;
}

@Injectable()
export class CacheInvalidationService {
  private readonly strategies = new Map<string, InvalidationStrategy>();

  constructor(
    private readonly cache: CacheService,
    private readonly logger: LoggingService,
  ) {
    this.initializeStrategies();
  }

  private initializeStrategies() {
    // Food-related invalidation strategies
    this.strategies.set('food:create', {
      pattern: 'foods',
      dependencies: ['foods:list', 'foods:count'],
    });

    this.strategies.set('food:update', {
      pattern: 'foods',
      dependencies: ['foods:list', 'foods:count', 'food_search:*'],
    });

    this.strategies.set('food:delete', {
      pattern: 'foods',
      dependencies: ['foods:list', 'foods:count'],
    });

    // User-related invalidation strategies
    this.strategies.set('user:update', {
      pattern: 'users',
      dependencies: ['user_with_preferences:*'],
    });

    this.strategies.set('user:preferences:update', {
      pattern: 'user_preferences',
      dependencies: ['user_with_preferences:*'],
    });
  }

  /**
   * Invalidate cache based on operation
   */
  async invalidate(
    operation: string,
    entityId?: string,
    additionalKeys?: string[],
  ): Promise<void> {
    const strategy = this.strategies.get(operation);
    if (!strategy) {
      this.logger.warn(
        `No invalidation strategy found for operation: ${operation}`,
      );
      return;
    }

    const keysToInvalidate: string[] = [];

    // Add pattern-based keys
    if (entityId) {
      keysToInvalidate.push(`${strategy.pattern}:${entityId}`);
    }

    // Add dependency keys
    if (strategy.dependencies) {
      keysToInvalidate.push(...strategy.dependencies);
    }

    // Add additional keys
    if (additionalKeys) {
      keysToInvalidate.push(...additionalKeys);
    }

    // Execute invalidation
    await this.executeInvalidation(keysToInvalidate);

    this.logger.debug(
      `Cache invalidated for operation ${operation}: ${keysToInvalidate.join(', ')}`,
    );
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    // For Redis pattern matching, we would use SCAN command
    // For now, we'll implement specific pattern handling
    const keysToInvalidate = this.getKeysByPattern(pattern);
    await this.executeInvalidation(keysToInvalidate);

    this.logger.debug(
      `Cache invalidated by pattern ${pattern}: ${keysToInvalidate.length} keys`,
    );
  }

  /**
   * Invalidate all cache for an entity type
   */
  async invalidateEntity(entityType: string, entityId?: string): Promise<void> {
    const keysToInvalidate: string[] = [];

    if (entityId) {
      keysToInvalidate.push(`${entityType}:${entityId}`);
    }

    // Add common patterns
    keysToInvalidate.push(
      `${entityType}:list`,
      `${entityType}:count`,
      `${entityType}:all`,
    );

    await this.executeInvalidation(keysToInvalidate);

    this.logger.debug(
      `Entity cache invalidated for ${entityType}${entityId ? `:${entityId}` : ''}`,
    );
  }

  /**
   * Time-based cache invalidation
   */
  scheduleInvalidation(keys: string[], delayMs: number): void {
    setTimeout(() => {
      void this.executeInvalidation(keys);
      this.logger.debug(
        `Scheduled cache invalidation executed for: ${keys.join(', ')}`,
      );
    }, delayMs);
  }

  /**
   * Conditional cache invalidation
   */
  async conditionalInvalidate(
    condition: () => Promise<boolean>,
    keys: string[],
  ): Promise<void> {
    if (await condition()) {
      await this.executeInvalidation(keys);
      this.logger.debug(
        `Conditional cache invalidation executed for: ${keys.join(', ')}`,
      );
    }
  }

  /**
   * Bulk invalidation for multiple operations
   */
  async bulkInvalidate(
    operations: Array<{
      operation: string;
      entityId?: string;
      additionalKeys?: string[];
    }>,
  ): Promise<void> {
    const allKeys = new Set<string>();

    for (const op of operations) {
      const strategy = this.strategies.get(op.operation);
      if (strategy) {
        if (op.entityId) {
          allKeys.add(`${strategy.pattern}:${op.entityId}`);
        }
        if (strategy.dependencies) {
          strategy.dependencies.forEach((key) => allKeys.add(key));
        }
        if (op.additionalKeys) {
          op.additionalKeys.forEach((key) => allKeys.add(key));
        }
      }
    }

    await this.executeInvalidation(Array.from(allKeys));

    this.logger.debug(
      `Bulk cache invalidation executed for ${allKeys.size} keys`,
    );
  }

  /**
   * Get cache invalidation statistics
   */
  getInvalidationStats(): {
    strategiesCount: number;
    strategies: string[];
  } {
    return {
      strategiesCount: this.strategies.size,
      strategies: Array.from(this.strategies.keys()),
    };
  }

  private async executeInvalidation(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      // Filter out pattern keys (ending with *) and handle them separately
      const exactKeys = keys.filter((key) => !key.includes('*'));
      const patternKeys = keys.filter((key) => key.includes('*'));

      // Delete exact keys
      if (exactKeys.length > 0) {
        await this.cache.delMany(exactKeys);
      }

      // Handle pattern keys (in a real implementation, you'd use Redis SCAN)
      for (const patternKey of patternKeys) {
        const matchingKeys = this.getKeysByPattern(patternKey);
        if (matchingKeys.length > 0) {
          await this.cache.delMany(matchingKeys);
        }
      }
    } catch (error) {
      this.logger.error('Error during cache invalidation:', error);
    }
  }

  private getKeysByPattern(pattern: string): string[] {
    // In a real implementation, you would use Redis SCAN command
    // For now, return empty array as we don't have pattern matching implemented
    this.logger.debug(`Pattern matching not implemented for: ${pattern}`);
    return [];
  }
}
