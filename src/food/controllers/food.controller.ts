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
  UseGuards,
  UseInterceptors,
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
import { ApiCommonErrorResponses } from '../../common/decorators/api-error-responses.decorator';
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
import { CacheInterceptor } from '../../cache/cache.interceptor';
import { CacheEvictInterceptor } from '../../cache/cache-evict.interceptor';
import { Cacheable, CacheEvict } from '../../cache/decorators/cache.decorator';
import { UserContextService } from '../../auth/user-context.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

@ApiTags('foods')
@Controller('foods')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
@UseInterceptors(CacheInterceptor, CacheEvictInterceptor)
export class FoodController {
  constructor(
    private readonly foodService: FoodService,
    private readonly userContextService: UserContextService,
  ) {}

  @Post()
  @CacheEvict(['foods:list', 'foods:count'])
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
  @ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
    conflict: true,
  })
  async create(
    @Body() createFoodDto: CreateFoodDto,
    @CurrentUser('id') userId: string,
  ): Promise<FoodResponseDto> {
    // Get the internal userId for database operations
    return this.foodService.create(createFoodDto, userId);
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
  @ApiCommonErrorResponses({
    badRequest: true,
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
  @ApiCommonErrorResponses({
    badRequest: true,
    custom: [
      {
        status: 503,
        description: 'OpenFoodFacts service unavailable',
      },
    ],
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
  @ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
    notFound: true,
    custom: [
      {
        status: 503,
        description: 'OpenFoodFacts service unavailable',
      },
    ],
  })
  async importFromOpenFoodFacts(
    @Param('barcode') barcode: string,
    @CurrentUser('id') userId: string,
  ): Promise<FoodResponseDto> {
    // Get the internal userId for database operations
    return this.foodService.importFromOpenFoodFacts(barcode, userId);
  }

  @Get('barcode/:barcode')
  @Cacheable('food_barcode', 300) // Cache for 5 minutes
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
  @ApiCommonErrorResponses({
    notFound: true,
  })
  async findByBarcode(
    @Param('barcode') barcode: string,
    @Query('includeOpenFoodFacts') includeOpenFoodFacts?: string,
  ): Promise<FoodResponseDto> {
    const includeOff = includeOpenFoodFacts === 'true';
    return this.foodService.findByBarcode(barcode, includeOff);
  }

  @Get(':id')
  @Cacheable('food', 300) // Cache for 5 minutes
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
  @ApiCommonErrorResponses({
    notFound: true,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeOpenFoodFacts') includeOpenFoodFacts?: string,
  ): Promise<FoodResponseDto> {
    const includeOff = includeOpenFoodFacts === 'true';
    return this.foodService.findOne(id, includeOff);
  }

  @Patch(':id')
  @CacheEvict(['food:{id}', 'food_barcode:{barcode}', 'foods:list'])
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
  @ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
    notFound: true,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFoodDto: UpdateFoodDto,
  ): Promise<FoodResponseDto> {
    return this.foodService.update(id, updateFoodDto);
  }

  @Delete(':id')
  @CacheEvict(['food:{id}', 'food_barcode:{barcode}', 'foods:list'])
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
  @ApiCommonErrorResponses({
    unauthorized: true,
    forbidden: true,
    notFound: true,
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.foodService.remove(id);
  }

  @Get(':id/openfoodfacts')
  @Cacheable('openfoodfacts', 3600) // Cache for 1 hour
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
  @ApiCommonErrorResponses({
    notFound: true,
    custom: [
      {
        status: 503,
        description: 'OpenFoodFacts service unavailable',
      },
    ],
  })
  async getOpenFoodFactsInfo(@Param('id', ParseUUIDPipe) id: string) {
    const food = await this.foodService.findOne(id);
    if (!food.barcode) {
      return null;
    }
    return this.foodService.getOpenFoodFactsInfo(food.barcode);
  }
}
