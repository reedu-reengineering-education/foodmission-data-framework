import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RecipeRecommendationsService } from '../services/recipe-recommendations.service';
import { QueryRecommendationsDto } from '../dto/query-recommendations.dto';
import { MultipleRecipeRecommendationResponseDto } from '../dto/recipe-recommendation-response.dto';

@ApiTags('recipes')
@Controller('recipes/me/recommendations')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class RecipeRecommendationsController {
  constructor(
    private readonly recommendationsService: RecipeRecommendationsService,
  ) {}

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Get recipe recommendations based on expiring pantry items',
    description:
      'Returns recipes ranked by ingredient match and expiring item priority. ' +
      'Recipes using ingredients that are expiring soon are boosted in the ranking.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe recommendations retrieved successfully',
    type: MultipleRecipeRecommendationResponseDto,
  })
  async getRecommendations(
    @CurrentUser('id') userId: string,
    @Query() query: QueryRecommendationsDto,
  ): Promise<MultipleRecipeRecommendationResponseDto> {
    return this.recommendationsService.getRecommendations(userId, {
      expiringWithinDays: query.expiringWithinDays,
      minMatchPercentage: query.minMatchPercentage,
      limit: query.limit,
    });
  }
}
