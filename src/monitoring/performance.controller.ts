import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PerformanceService } from './performance.service';
import { CacheService } from '../cache/cache.service';

@ApiTags('Performance')
@Controller('performance')
export class PerformanceController {
  constructor(
    private readonly performanceService: PerformanceService,
    private readonly cacheService: CacheService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get performance summary' })
  @ApiResponse({
    status: 200,
    description: 'Performance summary retrieved successfully',
  })
  async getPerformanceSummary() {
    const [performanceSummary, cacheStats] = await Promise.all([
      this.performanceService.getPerformanceSummary(),
      this.cacheService.getStats(),
    ]);

    return {
      performance: performanceSummary,
      cache: cacheStats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('cache/stats')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics retrieved successfully',
  })
  async getCacheStats() {
    return this.cacheService.getStats();
  }

  @Get('cache/hit-rate')
  @ApiOperation({ summary: 'Get cache hit rates by prefix' })
  @ApiResponse({
    status: 200,
    description: 'Cache hit rates retrieved successfully',
  })
  async getCacheHitRates() {
    const prefixes = ['foods', 'users', 'food_categories', 'api'];
    const hitRates = await Promise.all(
      prefixes.map(async (prefix) => ({
        prefix,
        hitRate: await this.performanceService.getCacheHitRate(prefix),
      })),
    );

    return {
      hitRates,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('database/stats')
  @ApiOperation({ summary: 'Get database performance statistics' })
  @ApiResponse({
    status: 200,
    description: 'Database statistics retrieved successfully',
  })
  async getDatabaseStats() {
    // This would typically come from database monitoring
    return {
      activeConnections: 5, // This would be dynamic
      slowQueries: 0,
      averageQueryTime: 0.05,
      timestamp: new Date().toISOString(),
    };
  }
}
