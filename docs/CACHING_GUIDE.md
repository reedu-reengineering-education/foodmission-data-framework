# Caching and Performance Optimization Guide

This document describes the caching and performance optimization features implemented in the FOODMISSION Data Framework.

## Overview

The framework implements a comprehensive caching and performance optimization system with the following components:

- **Redis-based caching** for frequently accessed data
- **Database query optimization** with proper indexing
- **API response caching** middleware
- **Cache invalidation strategies** for data consistency
- **Performance monitoring** and query analysis tools

## Architecture

### Components

1. **CacheService** - NestJS cache manager with multi-store support
2. **CacheInterceptor** - Automatic API response caching
3. **CacheMiddleware** - Request-level caching middleware
4. **CacheInvalidationService** - Smart cache invalidation strategies
5. **OptimizedDatabaseService** - Database operations with caching
6. **PerformanceService** - Performance monitoring and metrics

### Cache Layers

```
┌─────────────────┐
│   API Layer     │ ← CacheMiddleware, CacheInterceptor
├─────────────────┤
│ Service Layer   │ ← OptimizedDatabaseService
├─────────────────┤
│  Cache Layer    │ ← Multi-store: Memory + Redis
├─────────────────┤
│ Database Layer  │ ← Optimized queries with indexes
└─────────────────┘
```

### Multi-Store Configuration

The cache uses a two-tier approach following NestJS documentation:

- **L1 Cache**: In-memory cache (CacheableMemory) for ultra-fast access
- **L2 Cache**: Redis for persistence and distributed caching

## Usage

### Basic Caching

```typescript
import { CacheService } from '../cache/cache.service';

@Injectable()
export class MyService {
  constructor(private readonly cache: CacheService) {}

  async getData(id: string) {
    const cacheKey = this.cache.generateKey('data', id);

    return this.cache.getOrSet(
      cacheKey,
      () => this.fetchDataFromDatabase(id),
      300, // 5 minutes TTL
    );
  }
}
```

### Controller Caching

```typescript
import { Cacheable } from '../cache/decorators/cache.decorator';
import { CacheInterceptor } from '../cache/cache.interceptor';

@Controller('foods')
@UseInterceptors(CacheInterceptor)
export class FoodController {
  @Get()
  @Cacheable('foods:list', 300) // Cache for 5 minutes
  async getFoods() {
    return this.foodService.findAll();
  }
}
```

### Optimized Database Operations

```typescript
import { OptimizedDatabaseService } from '../database/optimized-database.service';

@Injectable()
export class FoodService {
  constructor(private readonly optimizedDb: OptimizedDatabaseService) {}

  async getFoods(params: any) {
    // Automatically cached and performance monitored
    return this.optimizedDb.findFoods(params);
  }
}
```

## Cache Invalidation

### Automatic Invalidation

The system provides automatic cache invalidation for common operations:

```typescript
// Creating a food automatically invalidates related caches
await this.optimizedDb.createFood(data);
// Invalidates: foods:list, foods:count

// Updating a food invalidates specific caches
await this.optimizedDb.updateFood(id, data);
// Invalidates: food:${id}, foods:list, food_search:*
```

### Manual Invalidation

```typescript
import { CacheInvalidationService } from '../cache/cache-invalidation.service';

@Injectable()
export class MyService {
  constructor(private readonly cacheInvalidation: CacheInvalidationService) {}

  async updateData(id: string, data: any) {
    await this.dataService.update(id, data);

    // Invalidate specific caches
    await this.cacheInvalidation.invalidate('data:update', id, [
      'data:list',
      'data:count',
    ]);
  }
}
```

## Performance Monitoring

### Metrics Available

- **Query Performance**: Duration and count of database queries
- **Cache Performance**: Hit/miss ratios by key prefix
- **Connection Monitoring**: Active database connections
- **Slow Query Detection**: Automatic logging of slow queries

### Accessing Metrics

```bash
# Get performance summary
GET /performance/summary

# Get cache statistics
GET /performance/cache/stats

# Get cache hit rates
GET /performance/cache/hit-rate

# Get database statistics
GET /performance/database/stats
```

### Example Response

```json
{
  "performance": {
    "slowQueries": 0,
    "totalQueries": 1250,
    "cacheHitRate": 0.85,
    "activeConnections": 5
  },
  "cache": {
    "connected": true,
    "keyCount": 342,
    "memoryUsage": "2.1M"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Database Optimization

### Indexes Added

The following indexes have been added for optimal query performance:

**Foods Table:**

- `name` - For name-based searches
- `createdAt` - For date-based sorting
- `barcode` - For barcode lookups

**Users Table:**

- `email` - For email lookups
- `createdAt` - For date-based sorting

### Query Optimization Tips

1. **Use indexed fields** in WHERE clauses
2. **Limit result sets** with LIMIT/OFFSET
3. **Use specific selects** instead of SELECT \*
4. **Leverage composite indexes** for multi-field queries

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Cache TTL defaults (seconds)
CACHE_DEFAULT_TTL=300
CACHE_LONG_TTL=1800
CACHE_SHORT_TTL=60
```

### Cache Module Configuration

The cache module follows the exact NestJS documentation pattern:

```typescript
@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>(
          'REDIS_URL',
          'redis://localhost:6379',
        );

        return {
          stores: [
            new Keyv({
              store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
            new Keyv({
              store: new KeyvRedis(redisUrl),
            }),
          ],
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
})
export class CacheModule {}
```

### Cache TTL Guidelines

- **Dynamic data** (foods list): 5 minutes (300s)
- **Search results**: 3 minutes (180s)
- **User data**: 15 minutes (900s)
- **Real-time data**: 1 minute (60s)

## Best Practices

### Caching Strategy

1. **Cache frequently accessed data** with appropriate TTL
2. **Use cache hierarchies** (specific → general)
3. **Implement cache warming** for critical data
4. **Monitor cache hit rates** and adjust strategies

### Cache Key Naming

```typescript
// Good: Hierarchical and descriptive
'foods:list:category:123:page:1';
'user:profile:456';
'search:foods:query:abc123';

// Bad: Flat and unclear
'foodslist';
'user456';
'search1';
```

### Invalidation Strategy

1. **Invalidate immediately** after data changes
2. **Use pattern-based invalidation** for related data
3. **Implement cascade invalidation** for dependent data
4. **Monitor invalidation frequency** to avoid over-invalidation

## Monitoring and Debugging

### Cache Health Check

```typescript
// Check cache connection
const isConnected = this.cacheService.isConnected();

// Get cache statistics
const stats = await this.cacheService.getStats();
```

### Performance Debugging

```typescript
// Measure query performance
const result = await this.performanceService.measureQuery(
  'findMany',
  'foods',
  () => this.prisma.food.findMany(),
);
```

### Logging

The system provides detailed logging for:

- Cache hits/misses
- Slow queries (>1 second)
- Cache invalidation events
- Performance metrics

## Troubleshooting

### Common Issues

1. **High cache miss rate**
   - Check TTL settings
   - Verify cache key generation
   - Monitor invalidation frequency

2. **Slow queries**
   - Check database indexes
   - Analyze query patterns
   - Consider query optimization

3. **Memory usage**
   - Monitor Redis memory usage
   - Implement cache size limits
   - Use appropriate TTL values

### Health Checks

The system includes health checks for:

- Redis connection status
- Cache operation performance
- Database query performance

Access health status at: `GET /health`

## Future Enhancements

- **Distributed caching** with Redis Cluster
- **Cache warming** strategies
- **Advanced invalidation** with pattern matching
- **Cache analytics** dashboard
- **Automatic cache tuning** based on usage patterns
