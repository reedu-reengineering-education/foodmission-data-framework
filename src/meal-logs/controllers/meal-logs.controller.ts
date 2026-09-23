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
import { ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { MealLogsService } from '../services/meal-logs.service';
import { CreateMealLogDto } from '../dto/create-meal-log.dto';
import { UpdateMealLogDto } from '../dto/update-meal-log.dto';
import {
  MealLogResponseDto,
  MultipleMealLogResponseDto,
} from '../dto/meal-log-response.dto';
import { QueryMealLogDto } from '../dto/query-meal-log.dto';

@ApiTags('meal-logs')
@Controller('meal-logs')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class MealLogsController {
  constructor(private readonly mealLogService: MealLogsService) {}

  @Post()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a meal log',
    description:
      'Logs a meal either by linking a Meal (mealId) or, for a quick log, by ' +
      'reporting diet facts (flags) and substitutions (swaps) without one. ' +
      'Flags and swaps are given as the event types they record (e.g. MEAL_VEGAN, ' +
      'SWAP_BEEF_TO_LEGUMES). Records MEAL_LOGGED plus one event per reported flag ' +
      'and swap — MEAL_VEGAN also records MEAL_MEAT_FREE.',
  })
  @ApiBody({ type: CreateMealLogDto })
  @ApiResponse({
    status: 201,
    description: 'Meal log created successfully',
    type: MealLogResponseDto,
  })
  @ApiCrudErrorResponses()
  create(
    @Body() createMealLogDto: CreateMealLogDto,
    @CurrentUser('id') userId: string,
  ): Promise<MealLogResponseDto> {
    return this.mealLogService.create(createMealLogDto, userId);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List meal logs' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'typeOfMeal', required: false })
  @ApiQuery({ name: 'mealFromPantry', required: false })
  @ApiQuery({ name: 'eatenOut', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    description: 'Meal logs retrieved successfully',
    type: MultipleMealLogResponseDto,
  })
  @ApiCrudErrorResponses()
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryMealLogDto,
  ): Promise<MultipleMealLogResponseDto> {
    return this.mealLogService.findAll(userId, query);
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get meal log by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Meal log retrieved successfully',
    type: MealLogResponseDto,
  })
  @ApiCrudErrorResponses()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<MealLogResponseDto> {
    return this.mealLogService.findOne(id, userId);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update meal log' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Meal log updated successfully',
    type: MealLogResponseDto,
  })
  @ApiCrudErrorResponses()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMealLogDto: UpdateMealLogDto,
    @CurrentUser('id') userId: string,
  ): Promise<MealLogResponseDto> {
    return this.mealLogService.update(id, updateMealLogDto, userId);
  }

  @Delete(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete meal log' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Meal log deleted successfully' })
  @ApiCrudErrorResponses()
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.mealLogService.remove(id, userId);
  }
}
