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
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';

@ApiTags('generic-foods')
@Controller('generic-foods')
@UseGuards(DataBaseAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GenericFoodsController {
  constructor(private readonly genericFoodService: GenericFoodService) {}

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
    summary: 'Get all generic foods',
    description:
      'Get a paginated list of generic foods with optional filtering and locale overlay',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({
    name: 'foodGroup',
    required: false,
    description: 'Food group filter (English canonical)',
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
      'Get a list of all distinct food groups available, optionally filtered by search term and localized via lang',
  })
  @ApiResponse({
    status: 200,
    description: 'Food groups retrieved successfully',
    type: [String],
  })
  getAllFoodGroups(@Query() query: FoodGroupsQueryDto): Promise<string[]> {
    return this.genericFoodService.getAllFoodGroups(query.search, query.lang);
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
