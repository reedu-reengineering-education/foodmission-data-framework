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
import { FoodCategoriesService } from '../services/food-categories.service';
import { CreateFoodCategoryDto } from '../dto/create-food-category.dto';
import { UpdateFoodCategoryDto } from '../dto/update-food-category.dto';
import { FoodCategoryQueryDto } from '../dto/food-category-query.dto';
import { FoodCategoryResponseDto } from '../dto/food-category-response.dto';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

@ApiTags('food-categories')
@Controller('food-categories')
@UseGuards(DataBaseAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FoodCategoryController {
  constructor(private readonly foodCategoryService: FoodCategoriesService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({
    summary: 'Create a new food category',
    description: 'Admin only: Create a new food category with nutritional data',
  })
  @ApiResponse({
    status: 201,
    description: 'Food category created successfully',
    type: FoodCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async create(
    @Body() createDto: CreateFoodCategoryDto,
  ): Promise<FoodCategoryResponseDto> {
    return this.foodCategoryService.create(createDto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all food categories',
    description:
      'Get a paginated list of food categories with optional filtering',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({
    name: 'foodGroup',
    required: false,
    description: 'Food group filter',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Food categories retrieved successfully',
  })
  async findAll(@Query() query: FoodCategoryQueryDto) {
    return this.foodCategoryService.findAll(query);
  }

  @Get('food-groups')
  @Public()
  @ApiOperation({
    summary: 'Get all unique food groups',
    description:
      'Get a list of all distinct food groups available, optionally filtered by search term',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filter food groups by search term',
  })
  @ApiResponse({
    status: 200,
    description: 'Food groups retrieved successfully',
    type: [String],
  })
  async getAllFoodGroups(@Query('search') search?: string): Promise<string[]> {
    return this.foodCategoryService.getAllFoodGroups(search);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get food category by ID',
    description: 'Get detailed information about a specific food category',
  })
  @ApiResponse({
    status: 200,
    description: 'Food category found',
    type: FoodCategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Food category not found' })
  async findById(@Param('id') id: string): Promise<FoodCategoryResponseDto> {
    return this.foodCategoryService.findById(id);
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
    type: FoodCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Food category not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFoodCategoryDto,
  ): Promise<FoodCategoryResponseDto> {
    return this.foodCategoryService.update(id, updateDto);
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
  async delete(@Param('id') id: string): Promise<void> {
    return this.foodCategoryService.delete(id);
  }
}
