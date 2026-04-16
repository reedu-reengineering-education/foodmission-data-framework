import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { FoodWasteService } from '../services/food-waste.service';
import { CreateFoodWasteDto } from '../dto/create-food-waste.dto';
import { UpdateFoodWasteDto } from '../dto/update-food-waste.dto';
import { QueryFoodWasteDto } from '../dto/query-food-waste.dto';
import {
  FoodWasteResponseDto,
  MultipleFoodWasteResponseDto,
} from '../dto/food-waste-response.dto';
import {
  FoodWasteStatisticsDto,
  FoodWasteTrendsDto,
} from '../dto/food-waste-statistics.dto';

@ApiTags('food-waste')
@Controller('food-waste')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class FoodWasteController {
  constructor(private readonly foodWasteService: FoodWasteService) {}

  @Post()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Create a food waste entry',
    description:
      'Record food waste manually or from expired pantry items. Carbon footprint is automatically calculated if not provided.',
  })
  @ApiBody({ type: CreateFoodWasteDto })
  @ApiResponse({
    status: 201,
    description: 'Food waste entry created successfully',
    type: FoodWasteResponseDto,
  })
  @ApiCrudErrorResponses()
  create(
    @Body() createDto: CreateFoodWasteDto,
    @CurrentUser('id') userId: string,
  ): Promise<FoodWasteResponseDto> {
    return this.foodWasteService.create(createDto, userId);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List food waste entries',
    description:
      'Retrieve food waste entries with filtering by food, reason, method, and date range. Supports pagination.',
  })
  @ApiQuery({
    name: 'foodId',
    required: false,
    description: 'Filter by food ID',
  })
  @ApiQuery({
    name: 'pantryItemId',
    required: false,
    description: 'Filter by pantry item ID',
  })
  @ApiQuery({
    name: 'wasteReason',
    required: false,
    description: 'Filter by waste reason',
  })
  @ApiQuery({
    name: 'detectionMethod',
    required: false,
    description: 'Filter by detection method',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Filter by waste date from (ISO date string)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'Filter by waste date to (ISO date string)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Food waste entries retrieved successfully',
    type: MultipleFoodWasteResponseDto,
  })
  @ApiCrudErrorResponses()
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryFoodWasteDto,
  ): Promise<MultipleFoodWasteResponseDto> {
    return this.foodWasteService.findAll(userId, query);
  }

  @Get('statistics')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get food waste statistics',
    description:
      'Retrieve aggregated statistics including total waste, cost, carbon footprint, breakdown by reason/method, and most wasted foods.',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Start date for statistics (ISO date string)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'End date for statistics (ISO date string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: FoodWasteStatisticsDto,
  })
  @ApiCrudErrorResponses()
  getStatistics(
    @CurrentUser('id') userId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<FoodWasteStatisticsDto> {
    return this.foodWasteService.getStatistics(userId, dateFrom, dateTo);
  }

  @Get('trends')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get food waste trends',
    description:
      'Retrieve time-series data showing waste trends over a specified period. Useful for visualization.',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: true,
    description: 'Start date (ISO date string)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: true,
    description: 'End date (ISO date string)',
  })
  @ApiQuery({
    name: 'interval',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Time interval for grouping (default: day)',
  })
  @ApiResponse({
    status: 200,
    description: 'Trends retrieved successfully',
    type: FoodWasteTrendsDto,
  })
  @ApiCrudErrorResponses()
  getTrends(
    @CurrentUser('id') userId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('interval') interval?: 'day' | 'week' | 'month',
  ): Promise<FoodWasteTrendsDto> {
    return this.foodWasteService.getTrends(
      userId,
      dateFrom,
      dateTo,
      interval || 'day',
    );
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get food waste entry by ID',
    description:
      'Retrieve a single food waste entry. Only the owner can access.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Food waste entry ID' })
  @ApiResponse({
    status: 200,
    description: 'Food waste entry retrieved successfully',
    type: FoodWasteResponseDto,
  })
  @ApiCrudErrorResponses()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<FoodWasteResponseDto> {
    return this.foodWasteService.findOne(id, userId);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Update food waste entry',
    description:
      'Update details of a food waste entry. Carbon footprint is recalculated if quantity/unit/food changes.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Food waste entry ID' })
  @ApiBody({ type: UpdateFoodWasteDto })
  @ApiResponse({
    status: 200,
    description: 'Food waste entry updated successfully',
    type: FoodWasteResponseDto,
  })
  @ApiCrudErrorResponses()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateFoodWasteDto,
    @CurrentUser('id') userId: string,
  ): Promise<FoodWasteResponseDto> {
    return this.foodWasteService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Delete food waste entry',
    description:
      'Permanently delete a food waste entry. Only the owner can delete.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Food waste entry ID' })
  @ApiResponse({
    status: 204,
    description: 'Food waste entry deleted successfully',
  })
  @ApiCrudErrorResponses()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.foodWasteService.remove(id, userId);
  }
}
