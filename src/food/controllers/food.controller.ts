import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiOAuth2,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Public, Roles } from 'nest-keycloak-connect';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { FoodService } from '../services/food.service';
import { CreateFoodDto } from '../dto/create-food.dto';
import { UpdateFoodDto } from '../dto/update-food.dto';
import { FoodQueryDto, FoodSearchDto } from '../dto/food-query.dto';
import {
  FoodResponseDto,
  PaginatedFoodResponseDto,
} from '../dto/food-response.dto';

@ApiTags('foods')
@Controller('foods')
@UseGuards(ThrottlerGuard)
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Post()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for creating foods
  @ApiOperation({
    summary: 'Create a new food item',
    description:
      'Creates a new food item in the database. Requires user or admin role.',
  })
  @ApiBody({ type: CreateFoodDto })
  @ApiResponse({
    status: 201,
    description: 'Food item created successfully',
    type: FoodResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async create(
    @Body() createFoodDto: CreateFoodDto,
    @Request() req: any,
  ): Promise<FoodResponseDto> {
    // Extract user ID from request (set by Keycloak authentication)
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Set the createdBy field to the authenticated user's ID
    createFoodDto.createdBy = userId;

    return this.foodService.create(createFoodDto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all food items',
    description:
      'Retrieves a paginated list of food items with optional filtering and sorting.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of food items retrieved successfully',
    type: PaginatedFoodResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  async findAll(
    @Query() query: FoodQueryDto,
  ): Promise<PaginatedFoodResponseDto> {
    return this.foodService.findAll(query);
  }

  @Get('search/openfoodfacts')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 searches per minute
  @ApiOperation({
    summary: 'Search OpenFoodFacts database',
    description:
      'Search for products in the OpenFoodFacts database by name, category, or brand.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results from OpenFoodFacts',
    schema: {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          items: { $ref: '#/components/schemas/OpenFoodFactsInfoDto' },
        },
        count: { type: 'number' },
        page: { type: 'number' },
        page_size: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid search parameters',
  })
  @ApiResponse({
    status: 503,
    description: 'OpenFoodFacts service unavailable',
  })
  async searchOpenFoodFacts(@Query() searchDto: FoodSearchDto) {
    return this.foodService.searchOpenFoodFacts(searchDto);
  }

  @Post('import/openfoodfacts/:barcode')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 imports per minute
  @ApiOperation({
    summary: 'Import food from OpenFoodFacts',
    description:
      'Imports a food item from OpenFoodFacts database using barcode.',
  })
  @ApiParam({ name: 'barcode', type: 'string', description: 'Product barcode' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {},
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Food imported successfully',
    type: FoodResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid barcode',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found in OpenFoodFacts',
  })
  @ApiResponse({
    status: 503,
    description: 'OpenFoodFacts service unavailable',
  })
  async importFromOpenFoodFacts(
    @Param('barcode') barcode: string,
    @Request() req: any,
  ): Promise<FoodResponseDto> {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.foodService.importFromOpenFoodFacts(barcode, userId);
  }

  @Get('barcode/:barcode')
  @Public()
  @ApiOperation({
    summary: 'Find food by barcode',
    description:
      'Retrieves a food item by its barcode. Optionally includes OpenFoodFacts information.',
  })
  @ApiParam({ name: 'barcode', type: 'string', description: 'Product barcode' })
  @ApiQuery({
    name: 'includeOpenFoodFacts',
    required: false,
    type: 'boolean',
    description: 'Include OpenFoodFacts information in response',
  })
  @ApiResponse({
    status: 200,
    description: 'Food item found',
    type: FoodResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Food item not found',
  })
  async findByBarcode(
    @Param('barcode') barcode: string,
    @Query('includeOpenFoodFacts') includeOpenFoodFacts?: string,
  ): Promise<FoodResponseDto> {
    const includeOff = includeOpenFoodFacts === 'true';
    return this.foodService.findByBarcode(barcode, includeOff);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Find food by ID',
    description:
      'Retrieves a food item by its ID. Optionally includes OpenFoodFacts information.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Food item ID',
  })
  @ApiQuery({
    name: 'includeOpenFoodFacts',
    required: false,
    type: 'boolean',
    description: 'Include OpenFoodFacts information in response',
  })
  @ApiResponse({
    status: 200,
    description: 'Food item found',
    type: FoodResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Food item not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeOpenFoodFacts') includeOpenFoodFacts?: string,
  ): Promise<FoodResponseDto> {
    const includeOff = includeOpenFoodFacts === 'true';
    return this.foodService.findOne(id, includeOff);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({
    summary: 'Update food item',
    description: 'Updates a food item by its ID. Requires user or admin role.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Food item ID',
  })
  @ApiBody({ type: UpdateFoodDto })
  @ApiResponse({
    status: 200,
    description: 'Food item updated successfully',
    type: FoodResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Food item not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFoodDto: UpdateFoodDto,
  ): Promise<FoodResponseDto> {
    return this.foodService.update(id, updateFoodDto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
  @ApiOperation({
    summary: 'Delete food item',
    description: 'Deletes a food item by its ID. Requires admin role.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Food item ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Food item deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Food item not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.foodService.remove(id);
  }

  @Get(':id/openfoodfacts')
  @Public()
  @ApiOperation({
    summary: 'Get OpenFoodFacts information for food item',
    description:
      'Retrieves OpenFoodFacts information for a food item by its ID, if the food has a barcode.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Food item ID',
  })
  @ApiResponse({
    status: 200,
    description: 'OpenFoodFacts information retrieved successfully',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/OpenFoodFactsInfoDto' },
        { type: 'null' },
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Food item not found',
  })
  @ApiResponse({
    status: 503,
    description: 'OpenFoodFacts service unavailable',
  })
  async getOpenFoodFactsInfo(@Param('id', ParseUUIDPipe) id: string) {
    const food = await this.foodService.findOne(id);
    if (!food.barcode) {
      return null;
    }
    return this.foodService.getOpenFoodFactsInfo(food.barcode);
  }
}
