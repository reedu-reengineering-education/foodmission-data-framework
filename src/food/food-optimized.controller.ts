import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { OptimizedDatabaseService } from '../database/optimized-database.service';
import { CacheInterceptor } from '../cache/cache.interceptor';
import { Cacheable } from '../cache/decorators/cache.decorator';
import { CacheInvalidationService } from '../cache/cache-invalidation.service';

@ApiTags('Foods (Optimized)')
@Controller('foods-optimized')
@UseInterceptors(CacheInterceptor)
export class FoodOptimizedController {
  constructor(
    private readonly optimizedDb: OptimizedDatabaseService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  @Get()
  @Cacheable('foods:list', 300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get all foods with caching' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Foods retrieved successfully' })
  async getFoods(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('categoryId') categoryId?: string,
  ) {
    const params: any = {
      skip: skip ? parseInt(skip.toString()) : undefined,
      take: take ? parseInt(take.toString()) : undefined,
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    };

    if (categoryId) {
      params.where = { categoryId };
    }

    return this.optimizedDb.findFoods(params);
  }

  @Get('search')
  @Cacheable('foods:search', 180) // Cache for 3 minutes
  @ApiOperation({ summary: 'Search foods with caching' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchFoods(
    @Query('q') query: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    const params = {
      skip: skip ? parseInt(skip.toString()) : undefined,
      take: take ? parseInt(take.toString()) : undefined,
    };

    return this.optimizedDb.searchFoods(query, params);
  }

  @Get('categories')
  @Cacheable('food_categories:all', 1800) // Cache for 30 minutes
  @ApiOperation({ summary: 'Get all food categories with caching' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getCategories() {
    return this.optimizedDb.getFoodCategories();
  }

  @Get('by-category/:categoryId')
  @Cacheable('foods:by_category', 300) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get foods by category with caching' })
  @ApiResponse({ status: 200, description: 'Foods by category retrieved successfully' })
  async getFoodsByCategory(
    @Param('categoryId') categoryId: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    const params = {
      skip: skip ? parseInt(skip.toString()) : undefined,
      take: take ? parseInt(take.toString()) : undefined,
      orderBy: {
        name: 'asc',
      },
    };

    return this.optimizedDb.findFoodsByCategory(categoryId, params);
  }

  @Get(':id')
  @Cacheable('food:detail', 600) // Cache for 10 minutes
  @ApiOperation({ summary: 'Get food by ID with caching' })
  @ApiResponse({ status: 200, description: 'Food retrieved successfully' })
  async getFoodById(@Param('id') id: string) {
    return this.optimizedDb.findFoodById(id, {
      category: true,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create new food with cache invalidation' })
  @ApiResponse({ status: 201, description: 'Food created successfully' })
  async createFood(@Body() createFoodDto: any) {
    const result = await this.optimizedDb.createFood(createFoodDto);

    // Invalidate related caches
    await this.cacheInvalidation.invalidate('food:create', result.id, [
      `foods_by_category:${result.categoryId}`,
    ]);

    return result;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update food with cache invalidation' })
  @ApiResponse({ status: 200, description: 'Food updated successfully' })
  async updateFood(@Param('id') id: string, @Body() updateFoodDto: any) {
    const result = await this.optimizedDb.updateFood(id, updateFoodDto);

    // Invalidate related caches
    await this.cacheInvalidation.invalidate('food:update', id, [
      `foods_by_category:${result.categoryId}`,
    ]);

    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete food with cache invalidation' })
  @ApiResponse({ status: 200, description: 'Food deleted successfully' })
  async deleteFood(@Param('id') id: string) {
    const result = await this.optimizedDb.deleteFood(id);

    // Invalidate related caches
    await this.cacheInvalidation.invalidate('food:delete', id);

    return result;
  }

  @Get('stats/database')
  @ApiOperation({ summary: 'Get database statistics' })
  @ApiResponse({ status: 200, description: 'Database statistics retrieved successfully' })
  async getDatabaseStats() {
    return this.optimizedDb.getDatabaseStats();
  }
}