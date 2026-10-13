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
import { CreateMealLogDto, MealLogFactsDto } from '../dto/create-meal-log.dto';
import { MealLogStatus } from '@prisma/client';
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
      'reporting diet, nutrition and food waste facts (flags) and substitutions (swaps) without one. ' +
      'Flags and swaps are given as the event types they record (e.g. MEAL_VEGAN, ' +
      'NUTRITION_WHOLEGRAIN_CHOSEN, FOOD_WASTE_FULL_PLATE_SAVED, SWAP_BEEF_TO_LEGUMES). Records MEAL_LOGGED plus one event per reported flag ' +
      'and swap — MEAL_VEGAN also records MEAL_MEAT_FREE. With a mealId, flags are ' +
      'also derived from the meal items (NEVO foods and OpenFoodFacts products): ' +
      'MEAL_MEAT_CONSUMED, MEAL_MEAT_FREE, MEAL_VEGAN, MEAL_LEGUME_CONSUMED, ' +
      'MEAL_ANCIENT_GRAIN and MEAL_CERTIFIED_PRODUCT. A derived flag that ' +
      'contradicts a reported one is dropped. With draft: true the log is ' +
      'staged instead: it is stored as DRAFT with the derived flags (also in ' +
      'derivedFlags) and records nothing until POST /meal-logs/:id/confirm.',
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
  @ApiQuery({ name: 'status', required: false, enum: MealLogStatus })
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
  @ApiOperation({
    summary: 'Get meal log by id',
    description:
      "For a DRAFT log the flags are derived again from the meal's current " +
      'items: proposals that no longer apply are removed, new ones added, and ' +
      "the user's decisions on unchanged proposals kept.",
  })
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
  @ApiOperation({
    summary: 'Update meal log',
    description:
      'flags and swaps can only be changed while the log is a DRAFT. ' +
      'Changing mealId on a draft derives its flags again.',
  })
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

  @Post(':id/confirm')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Confirm a staged meal log',
    description:
      "Submits a DRAFT log: the optional flags/swaps replace the draft's " +
      '(derived flags not listed are dropped), the log becomes CONFIRMED and ' +
      'records MEAL_LOGGED plus one event per flag and swap, dated at the ' +
      'meal. Kept derived flags are recorded with flagSource both, added ' +
      'ones with user. Confirming a CONFIRMED log returns it unchanged.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: MealLogFactsDto, required: false })
  @ApiResponse({
    status: 201,
    description: 'Meal log confirmed',
    type: MealLogResponseDto,
  })
  @ApiCrudErrorResponses()
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() facts: MealLogFactsDto,
    @CurrentUser('id') userId: string,
  ): Promise<MealLogResponseDto> {
    return this.mealLogService.confirm(id, facts ?? {}, userId);
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
