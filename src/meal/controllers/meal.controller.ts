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
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { MealService } from '../services/meal.service';
import { CreateMealDto } from '../dto/create-meal.dto';
import { UpdateMealDto } from '../dto/update-meal.dto';
import {
  MealResponseDto,
  MultipleMealResponseDto,
} from '../dto/meal-response.dto';
import { QueryMealDto } from '../dto/query-meal.dto';

@ApiTags('meals')
@Controller('meals')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class MealController {
  constructor(private readonly mealService: MealService) {}

  @Post()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a meal' })
  @ApiBody({ type: CreateMealDto })
  @ApiResponse({
    status: 201,
    description: 'Meal created successfully',
    type: MealResponseDto,
  })
  @ApiCrudErrorResponses()
  create(
    @Body() createMealDto: CreateMealDto,
    @CurrentUser('id') userId: string,
  ): Promise<MealResponseDto> {
    return this.mealService.create(createMealDto, userId);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List meals for the user' })
  @ApiQuery({ name: 'mealType', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    description: 'Meals retrieved successfully',
    type: MultipleMealResponseDto,
  })
  @ApiCrudErrorResponses()
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryMealDto,
  ): Promise<MultipleMealResponseDto> {
    return this.mealService.findAll(userId, query);
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a meal by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Meal retrieved successfully',
    type: MealResponseDto,
  })
  @ApiCrudErrorResponses()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<MealResponseDto> {
    return this.mealService.findOne(id, userId);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a meal' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Meal updated successfully',
    type: MealResponseDto,
  })
  @ApiCrudErrorResponses()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMealDto: UpdateMealDto,
    @CurrentUser('id') userId: string,
  ): Promise<MealResponseDto> {
    return this.mealService.update(id, updateMealDto, userId);
  }

  @Delete(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a meal' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Meal deleted successfully' })
  @ApiCrudErrorResponses()
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.mealService.remove(id, userId);
  }
}
