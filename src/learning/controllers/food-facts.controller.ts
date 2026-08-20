import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { PaginatedResponseDto } from '../../common/dto/api-response.dto';
import { LearningService } from '../services/learning.service';
import { LearningLangQueryDto } from '../dto/learning-lang-query.dto';
import { LearningPaginatedQueryDto } from '../dto/learning-list-query.dto';
import { FoodFactResponseDto } from '../dto/food-fact-response.dto';

@ApiTags('food-facts')
@Controller('food-facts')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class FoodFactsController {
  constructor(private readonly learningService: LearningService) {}

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List available food facts (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated food facts' })
  @ApiCrudErrorResponses()
  async list(
    @Query() query: LearningPaginatedQueryDto,
  ): Promise<PaginatedResponseDto<FoodFactResponseDto>> {
    return this.learningService.listFoodFacts(query);
  }

  @Get('by-code/:code')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a food fact by code' })
  @ApiParam({
    name: 'code',
    description: 'Food fact code (e.g. FF1.1.1)',
    example: 'FF1.1.1',
  })
  @ApiResponse({ status: 200, type: FoodFactResponseDto })
  @ApiCrudErrorResponses()
  async getByCode(
    @Param('code') code: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<FoodFactResponseDto> {
    return this.learningService.getFoodFact(code, query);
  }

  @Get(':codeOrId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a food fact by UUID or code' })
  @ApiParam({
    name: 'codeOrId',
    description: 'Food fact UUID or code (e.g. FF1.1.1)',
    example: 'FF1.1.1',
  })
  @ApiResponse({ status: 200, type: FoodFactResponseDto })
  @ApiCrudErrorResponses()
  async getOne(
    @Param('codeOrId') codeOrId: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<FoodFactResponseDto> {
    return this.learningService.getFoodFact(codeOrId, query);
  }
}
