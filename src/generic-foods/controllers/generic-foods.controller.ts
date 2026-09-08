import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles, Public } from 'nest-keycloak-connect';
import { GenericFoodService } from '../services/generic-food.service';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CreateGenericFoodDto } from '../dto/create-generic-food.dto';
import { UpdateGenericFoodDto } from '../dto/update-generic-food.dto';
import { GenericFoodQueryDto } from '../dto/generic-food-query.dto';
import { FoodGroupsQueryDto } from '../dto/food-groups-query.dto';
import { GenericFoodResponseDto } from '../dto/generic-food-response.dto';
import { FoodGroupResponseDto } from '../dto/food-group-response.dto';
import { Foodex2FoodService } from '../services/foodex2-food.service';
import { Foodex2SearchQueryDto } from '../dto/foodex2-search-query.dto';
import { Foodex2FoodResponseDto } from '../dto/foodex2-food-response.dto';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';

@ApiTags('generic-foods')
@Controller('generic-foods')
@UseGuards(DataBaseAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GenericFoodsController {
  constructor(
    private readonly genericFoodService: GenericFoodService,
    private readonly foodex2FoodService: Foodex2FoodService,
  ) {}

  @Post()
  @Roles('admin')
  @ApiOperation({
    summary: 'Create a new generic food',
    description: 'Admin only: Create a new generic food with nutritional data',
  })
  @ApiResponse({
    status: 201,
    description: 'Generic food created successfully',
    type: GenericFoodResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  create(
    @Body() createDto: CreateGenericFoodDto,
  ): Promise<GenericFoodResponseDto> {
    return this.genericFoodService.create(createDto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all generic foods (raw NEVO catalogue)',
    description:
      'Paginated list of the raw NEVO records with optional filtering and ' +
      'locale overlay. Kept for backwards compatibility and admin use — the ' +
      'user-facing food search is GET /generic-foods/search, which searches ' +
      'FoodEx2 foods instead of individual NEVO variants.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({
    name: 'foodGroup',
    required: false,
    description:
      'Food group filter (partial match; English or translated when lang is set)',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: SUPPORTED_LOCALES,
    description: `Optional locale for translated labels. Defaults to ${DEFAULT_LOCALE}.`,
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Food categories retrieved successfully',
  })
  findAll(@Query() query: GenericFoodQueryDto) {
    return this.genericFoodService.findAll(query);
  }

  @Get('food-groups')
  @Public()
  @ApiOperation({
    summary: 'Get all unique food groups',
    description:
      'Get distinct food groups with a stable English-derived slug (for icon matching) and a localized display name',
  })
  @ApiResponse({
    status: 200,
    description: 'Food groups retrieved successfully',
    type: [FoodGroupResponseDto],
  })
  getAllFoodGroups(
    @Query() query: FoodGroupsQueryDto,
  ): Promise<FoodGroupResponseDto[]> {
    return this.genericFoodService.getAllFoodGroups(query.search, query.lang);
  }

  @Get('search')
  @Public()
  @ApiOperation({
    summary: 'Search foods (FoodEx2)',
    description:
      'Primary user-facing food search. Matches FoodEx2 food names rather ' +
      'than individual NEVO records, so "pasta" returns the concept "Dried ' +
      'pasta" instead of every NEVO pasta variant. Each result resolves to a ' +
      'single canonical NEVO record, whose nutritional values are returned ' +
      'unchanged. Foods without a canonical NEVO record are never returned.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term (case-insensitive, partial match)',
  })
  @ApiQuery({
    name: 'coreOnly',
    required: false,
    description: 'Restrict results to the FoodEx2 core list',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: SUPPORTED_LOCALES,
    description:
      `Locale for FoodEx2 names, and for matching translated food names ` +
      `(searching "Nudeln" with lang=de finds the pasta concept). ` +
      `Defaults to ${DEFAULT_LOCALE}.`,
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'FoodEx2 foods retrieved successfully',
  })
  searchFoodex2Foods(@Query() query: Foodex2SearchQueryDto) {
    return this.foodex2FoodService.search(query);
  }

  @Get('foodex2/:code')
  @Public()
  @ApiOperation({
    summary: 'Get a FoodEx2 food by code',
    description:
      'Resolves a FoodEx2 code to its canonical NEVO record and returns that ' +
      "record's nutritional values.",
  })
  @ApiResponse({
    status: 200,
    description: 'FoodEx2 food retrieved successfully',
    type: Foodex2FoodResponseDto,
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: SUPPORTED_LOCALES,
    description: `Locale for the FoodEx2 name. Defaults to ${DEFAULT_LOCALE}.`,
  })
  @ApiResponse({
    status: 404,
    description: 'Unknown FoodEx2 code, or no canonical NEVO record',
  })
  getFoodex2Food(
    @Param('code') code: string,
    @Query('lang') lang?: string,
  ): Promise<Foodex2FoodResponseDto> {
    return this.foodex2FoodService.findByFoodex2Code(code, lang);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get food category by ID',
    description: 'Get detailed information about a specific food category',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: SUPPORTED_LOCALES,
    description: `Optional locale for translated labels. Defaults to ${DEFAULT_LOCALE}.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Food category found',
    type: GenericFoodResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Food category not found' })
  findById(
    @Param('id') id: string,
    @Query('lang') lang?: string,
  ): Promise<GenericFoodResponseDto> {
    return this.genericFoodService.findById(id, lang);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Update food category',
    description: 'Admin only: Update a food category by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Food category updated successfully',
    type: GenericFoodResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Food category not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateGenericFoodDto,
  ): Promise<GenericFoodResponseDto> {
    return this.genericFoodService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete food category',
    description: 'Admin only: Delete a food category by ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Food category deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Food category not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  delete(@Param('id') id: string): Promise<void> {
    return this.genericFoodService.delete(id);
  }
}
