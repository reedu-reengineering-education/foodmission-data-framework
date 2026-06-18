import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';
import { DateRangeQuery } from '../../common/decorators/date-range-query.decorator';
import { RecipeAnalyticsQueryDto } from '../dto/recipe-analytics-query.dto';
import { RecipeAnalyticsService } from '../services/recipe-analytics.service';

@ApiTags('analytics-recipes')
@Controller('analytics/recipes')
export class RecipeAnalyticsController {
  constructor(private readonly recipeAnalyticsService: RecipeAnalyticsService) {}

  @Public()
  @Get('public/summary')
  @ApiOperation({ summary: 'Recipe analytics summary KPIs' })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'Recipe analytics summary' })
  getPublicSummary(@Query() query: RecipeAnalyticsQueryDto) {
    return this.recipeAnalyticsService.getSummary(query);
  }

  @Public()
  @Get('public/diet-trend')
  @ApiOperation({ summary: 'Daily trend of recipe diet labels' })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'Diet trend time series' })
  getPublicDietTrend(@Query() query: RecipeAnalyticsQueryDto) {
    return this.recipeAnalyticsService.getDietTrend(query);
  }

  @Public()
  @Get('public/diet-distribution')
  @ApiOperation({ summary: 'Diet label distribution across recipes' })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'Diet distribution' })
  getPublicDietDistribution(@Query() query: RecipeAnalyticsQueryDto) {
    return this.recipeAnalyticsService.getDietDistribution(query);
  }

  @Public()
  @Get('public/nutrition')
  @ApiOperation({ summary: 'Recipe nutrition analytics over time' })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'Nutrition trend rows' })
  getPublicNutrition(@Query() query: RecipeAnalyticsQueryDto) {
    return this.recipeAnalyticsService.getNutrition(query);
  }

  @Public()
  @Get('public/sustainability')
  @ApiOperation({ summary: 'Recipe sustainability analytics over time' })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'Sustainability trend rows' })
  getPublicSustainability(@Query() query: RecipeAnalyticsQueryDto) {
    return this.recipeAnalyticsService.getSustainability(query);
  }

  @Public()
  @Get('public/top-ingredients')
  @ApiOperation({ summary: 'Most used ingredients in recipes' })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'Top ingredients list' })
  getPublicTopIngredients(@Query() query: RecipeAnalyticsQueryDto) {
    return this.recipeAnalyticsService.getTopIngredients(query);
  }

  @Public()
  @Get('public/ingredient-categories')
  @ApiOperation({ summary: 'Ingredient category usage in recipes' })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'Ingredient category distribution' })
  getPublicIngredientCategories(@Query() query: RecipeAnalyticsQueryDto) {
    return this.recipeAnalyticsService.getIngredientCategories(query);
  }

  @Public()
  @Get('public/diversity')
  @ApiOperation({ summary: 'Recipe diversity metrics' })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'Diversity metrics' })
  getPublicDiversity(@Query() query: RecipeAnalyticsQueryDto) {
    return this.recipeAnalyticsService.getDiversity(query);
  }

  @Public()
  @Get('public/cuisine-trends')
  @ApiOperation({ summary: 'Cuisine trend analytics' })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'Cuisine trend rows' })
  getPublicCuisineTrends(@Query() query: RecipeAnalyticsQueryDto) {
    return this.recipeAnalyticsService.getCuisineTrends(query);
  }

  @Public()
  @Get('public/cooking-patterns')
  @ApiOperation({ summary: 'Cooking time pattern analytics' })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'Cooking pattern metrics' })
  getPublicCookingPatterns(@Query() query: RecipeAnalyticsQueryDto) {
    return this.recipeAnalyticsService.getCookingPatterns(query);
  }

  @Public()
  @Get('public/difficulty')
  @ApiOperation({ summary: 'Recipe difficulty distribution' })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'Difficulty distribution rows' })
  getPublicDifficulty(@Query() query: RecipeAnalyticsQueryDto) {
    return this.recipeAnalyticsService.getDifficulty(query);
  }

  @Public()
  @Get('public/usage')
  @ApiOperation({ summary: 'Recipe usage analytics based on cooking events' })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'Usage metrics' })
  getPublicUsage(@Query() query: RecipeAnalyticsQueryDto) {
    return this.recipeAnalyticsService.getUsage(query);
  }
}
