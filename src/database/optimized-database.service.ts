import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CacheService } from '../cache/cache.service';
import { PerformanceService } from '../monitoring/performance.service';
import { LoggingService } from '../common/logging/logging.service';

@Injectable()
export class OptimizedDatabaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly performance: PerformanceService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Execute a query with performance monitoring and caching
   */
  async executeWithCache<T>(
    operation: string,
    table: string,
    cacheKey: string,
    queryFn: () => Promise<T>,
    cacheTTL: number = 300,
  ): Promise<T> {
    // Try cache first
    const cached = await this.cache.get<T>(cacheKey);
    if (cached !== undefined) {
      this.performance.recordCacheHit(table);
      return cached;
    }

    this.performance.recordCacheMiss(table);

    // Execute query with performance monitoring
    const result = await this.performance.measureQuery(
      operation,
      table,
      queryFn,
    );

    // Cache the result
    await this.cache.set(cacheKey, result, cacheTTL);

    return result;
  }

  /**
   * Find foods with optimized query and caching
   */
  async findFoods(params: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
    include?: any;
  }) {
    const cacheKey = this.cache.generateKey('foods', JSON.stringify(params));

    return this.executeWithCache(
      'findMany',
      'foods',
      cacheKey,
      () => this.prisma.food.findMany(params),
      300, // 5 minutes
    );
  }

  /**
   * Find food by ID with caching
   */
  async findFoodById(id: string, include?: any) {
    const cacheKey = this.cache.generateKey(
      'food',
      id,
      JSON.stringify(include || {}),
    );

    return this.executeWithCache(
      'findUnique',
      'foods',
      cacheKey,
      () =>
        this.prisma.food.findUnique({
          where: { id },
          include,
        }),
      600, // 10 minutes
    );
  }

  /**
   * Find foods by category with caching
   */
  async findFoodsByCategory(
    categoryId: string,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: any;
    },
  ) {
    const cacheKey = this.cache.generateKey(
      'foods_by_category',
      categoryId,
      JSON.stringify(params || {}),
    );

    return this.executeWithCache(
      'findMany',
      'foods',
      cacheKey,
      () =>
        this.prisma.food.findMany({
          where: { categoryId },
          ...params,
        }),
      300, // 5 minutes
    );
  }

  /**
   * Search foods with full-text search and caching
   */
  async searchFoods(
    query: string,
    params?: {
      skip?: number;
      take?: number;
    },
  ) {
    const cacheKey = this.cache.generateKey(
      'food_search',
      query,
      JSON.stringify(params || {}),
    );

    return this.executeWithCache(
      'findMany',
      'foods',
      cacheKey,
      () =>
        this.prisma.food.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          include: {
            category: true,
          },
          ...params,
        }),
      180, // 3 minutes (shorter for search results)
    );
  }

  /**
   * Get food categories with caching
   */
  async getFoodCategories() {
    const cacheKey = 'food_categories:all';

    return this.executeWithCache(
      'findMany',
      'food_categories',
      cacheKey,
      () =>
        this.prisma.foodCategory.findMany({
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { foods: true },
            },
          },
        }),
      1800, // 30 minutes (categories change less frequently)
    );
  }

  /**
   * Get user with preferences and caching
   */
  async getUserWithPreferences(userId: string) {
    const cacheKey = this.cache.generateKey('user_with_preferences', userId);

    return this.executeWithCache(
      'findUnique',
      'users',
      cacheKey,
      () =>
        this.prisma.user.findUnique({
          where: { id: userId },
        }),
      900, // 15 minutes
    );
  }

  /**
   * Create food and invalidate related caches
   */
  async createFood(data: any) {
    const result = await this.performance.measureQuery('create', 'foods', () =>
      this.prisma.food.create({ data }),
    );

    // Invalidate related caches
    await this.invalidateFoodCaches(data.categoryId);

    return result;
  }

  /**
   * Update food and invalidate related caches
   */
  async updateFood(id: string, data: any) {
    const result = await this.performance.measureQuery('update', 'foods', () =>
      this.prisma.food.update({
        where: { id },
        data,
      }),
    );

    // Invalidate related caches
    await this.invalidateFoodCaches(data.categoryId, id);

    return result;
  }

  /**
   * Delete food and invalidate related caches
   */
  async deleteFood(id: string) {
    // Get the food first to know which category to invalidate
    const food = await this.prisma.food.findUnique({
      where: { id },
      select: { categoryId: true },
    });

    const result = await this.performance.measureQuery('delete', 'foods', () =>
      this.prisma.food.delete({ where: { id } }),
    );

    // Invalidate related caches
    if (food) {
      await this.invalidateFoodCaches(food.categoryId, id);
    }

    return result;
  }

  /**
   * Invalidate food-related caches
   */
  private async invalidateFoodCaches(categoryId?: string, foodId?: string) {
    const keysToInvalidate = [
      'foods:*',
      'food_search:*',
      'food_categories:all',
    ];

    if (categoryId) {
      keysToInvalidate.push(`foods_by_category:${categoryId}:*`);
    }

    if (foodId) {
      keysToInvalidate.push(`food:${foodId}:*`);
    }

    // For now, we'll delete specific patterns
    // In a production environment, you might want to use Redis SCAN for pattern matching
    const specificKeys = ['food_categories:all'];

    if (foodId) {
      specificKeys.push(`food:${foodId}:`);
    }

    await this.cache.delMany(specificKeys);

    this.logger.debug(
      `Invalidated caches for food operation: ${keysToInvalidate.join(', ')}`,
    );
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    const stats = await Promise.all([
      this.prisma.food.count(),
      this.prisma.foodCategory.count(),
      this.prisma.user.count(),
    ]);

    return {
      foodCount: stats[0],
      categoryCount: stats[1],
      userCount: stats[2],
    };
  }

  /**
   * Execute raw query with performance monitoring
   */
  async executeRawQuery<T>(query: string, params?: any[]): Promise<T> {
    return this.performance.measureQuery('raw', 'database', () =>
      this.prisma.$queryRawUnsafe<T>(query, ...(params || [])),
    );
  }
}
