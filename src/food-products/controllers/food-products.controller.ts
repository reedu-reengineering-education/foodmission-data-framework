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
import { ApiOpenFoodFactsSearchQuery } from '../../common/decorators/api-query-params.decorator';
import { Public, Roles } from 'nest-keycloak-connect';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { FoodProductService } from '../services/food-product.service';
import { CreateFoodProductDto } from '../dto/create-food-product.dto';
import { UpdateFoodProductDto } from '../dto/update-food-product.dto';
import {
  FoodProductQueryDto,
  FoodProductSearchDto,
} from '../dto/food-product-query.dto';
import {
  FoodProductResponseDto,
  PaginatedFoodProductResponseDto,
} from '../dto/food-product-response.dto';
import { CacheInterceptor } from '../../cache/cache.interceptor';
import { CacheEvictInterceptor } from '../../cache/cache-evict.interceptor';
import { Cacheable, CacheEvict } from '../../cache/decorators/cache.decorator';
import { UserContextService } from '../../auth/user-context.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

@ApiTags('food-products')
@Controller('food-products')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
@UseInterceptors(CacheInterceptor, CacheEvictInterceptor)
@ApiBearerAuth('JWT-auth')
@ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
export class FoodProductController {
  constructor(
    private readonly foodProductService: FoodProductService,
    private readonly userContextService: UserContextService,
  ) {}

  @Post()
  @CacheEvict(['foods:list', 'foods:count'])
  @Roles('admin')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Create a new food item',
    description:
      'Creates a new food item in the database. Requires user or admin role.',
  })
  @ApiBody({ type: CreateFoodProductDto })
  @ApiResponse({
    status: 201,
    description: 'Food item created successfully',
    type: FoodProductResponseDto,
  })
  @ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
    conflict: true,
  })
  create(
    @Body() createFoodProductDto: CreateFoodProductDto,
    @CurrentUser('id') userId: string,
  ): Promise<FoodProductResponseDto> {
    return this.foodProductService.create(createFoodProductDto, userId);
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
    type: PaginatedFoodProductResponseDto,
  })
  @ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: false,
  })
  findAll(
    @Query() query: FoodProductQueryDto,
  ): Promise<PaginatedFoodProductResponseDto> {
    return this.foodProductService.findAll(query);
  }

  @Get('search/openfoodfacts')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Search OpenFoodFacts database',
    description:
      'Search for products in the OpenFoodFacts database by name, category, or brand. Supports pagination with page and pageSize parameters.',
  })
  @ApiOpenFoodFactsSearchQuery()
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
        totalCount: { type: 'number' },
        page: { type: 'number' },
        pageSize: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: false,
    custom: [
      {
        status: 503,
        description: 'OpenFoodFacts service unavailable',
      },
    ],
  })
  searchOpenFoodFacts(@Query() searchDto: FoodProductSearchDto) {
    return this.foodProductService.searchOpenFoodFacts(searchDto);
  }

  @Post('import/openfoodfacts/:barcode')
  @Roles('user', 'admin')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Import food from OpenFoodFacts',
    description:
      'Imports a food item from OpenFoodFacts database using barcode.',
  })
  @ApiParam({ name: 'barcode', type: 'string', description: 'Product barcode' })
  @ApiBody({ schema: { type: 'object', properties: {} } })
  @ApiResponse({
    status: 201,
    description: 'Food imported successfully',
    type: FoodProductResponseDto,
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
  importFromOpenFoodFacts(
    @Param('barcode') barcode: string,
    @CurrentUser('id') userId: string,
  ): Promise<FoodProductResponseDto> {
    return this.foodProductService.importFromOpenFoodFacts(barcode, userId);
  }

  @Get('barcode/:barcode')
  @Cacheable('food_barcode', 300)
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
    type: FoodProductResponseDto,
  })
  @ApiCommonErrorResponses({ notFound: true, unauthorized: false })
  findByBarcode(
    @Param('barcode') barcode: string,
    @Query('includeOpenFoodFacts') includeOpenFoodFacts?: string,
  ): Promise<FoodProductResponseDto> {
    const includeOff = includeOpenFoodFacts === 'true';
    return this.foodProductService.findByBarcode(barcode, includeOff);
  }

  @Get(':id')
  @Cacheable('food', 300)
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
    type: FoodProductResponseDto,
  })
  @ApiCommonErrorResponses({ notFound: true, unauthorized: false })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeOpenFoodFacts') includeOpenFoodFacts?: string,
  ): Promise<FoodProductResponseDto> {
    const includeOff = includeOpenFoodFacts === 'true';
    return this.foodProductService.findOne(id, includeOff);
  }

  @Patch(':id')
  @CacheEvict(['food:{id}', 'food_barcode:{barcode}', 'foods:list'])
  @Roles('admin')
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
  @ApiBody({ type: UpdateFoodProductDto })
  @ApiResponse({
    status: 200,
    description: 'Food item updated successfully',
    type: FoodProductResponseDto,
  })
  @ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
    notFound: true,
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFoodDto: UpdateFoodProductDto,
  ): Promise<FoodProductResponseDto> {
    return this.foodProductService.update(id, updateFoodDto);
  }

  @Delete(':id')
  @CacheEvict(['food:{id}', 'food_barcode:{barcode}', 'foods:list'])
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
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
  @ApiResponse({ status: 204, description: 'Food item deleted successfully' })
  @ApiCommonErrorResponses({ unauthorized: true, forbidden: true, notFound: true })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.foodProductService.remove(id);
  }

  @Get(':id/openfoodfacts')
  @Cacheable('openfoodfacts', 3600)
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
    unauthorized: false,
    custom: [{ status: 503, description: 'OpenFoodFacts service unavailable' }],
  })
  async getOpenFoodFactsInfo(@Param('id', ParseUUIDPipe) id: string) {
    const food = await this.foodProductService.findOne(id);
    if (!food.barcode) {
      return null;
    }
    return this.foodProductService.getOpenFoodFactsInfo(food.barcode);
  }
}
