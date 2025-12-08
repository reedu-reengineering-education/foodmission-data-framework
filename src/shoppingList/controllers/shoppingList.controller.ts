import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { Public, Roles } from 'nest-keycloak-connect';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ShoppingListService } from '../services/shoppingList.service';
import { CreateShoppingListDto } from '../dto/create-shoppingList.dto';
import {
  MultipleShoppingListResponseDto,
  ShoppingListResponseDto,
} from '../dto/shoppingList-response.dto';
import { UpdateShoppingListDto } from '../dto/update.shoppingList.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { QueryShoppingListItemDto } from '../../shoppingListItem/dto/query-soppingListItem.dto';
import { MultipleShoppingListItemResponseDto } from '../../shoppingListItem/dto/response-soppingListItem.dto';

@ApiTags('shoppinglist')
@Controller('shoppinglist')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class ShoppingListController {
  constructor(private readonly shoppingListService: ShoppingListService) {}

  @Post()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Create a new Shopping List',
    description:
      'Creates a new ShoppingList in the database. Requires user or admin role.',
  })
  @ApiBody({ type: CreateShoppingListDto })
  @ApiResponse({
    status: 201,
    description: 'Shopping list created successfully',
    type: ShoppingListResponseDto,
  })
  @ApiCrudErrorResponses()
  async create(
    @Body() createShoppingListDto: CreateShoppingListDto,
    @CurrentUser('id') userId: string,
  ): Promise<ShoppingListResponseDto> {
    return this.shoppingListService.create(createShoppingListDto, userId);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get All Shoppinglists',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: 200,
    description: 'Shopping lists retrieved successfully',
    type: MultipleShoppingListResponseDto,
  })
  @ApiCrudErrorResponses()
  async findAll(): Promise<MultipleShoppingListResponseDto> {
    return this.shoppingListService.findAll();
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get specific shopping list by ID',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Shopping list found',
    type: ShoppingListResponseDto,
  })
  @ApiCrudErrorResponses()
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ShoppingListResponseDto> {
    return this.shoppingListService.findById(id, userId);
  }

  @Get(':id/items')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get items for a specific shopping list',
    description:
      'Retrieve all items belonging to a shopping list with optional filters',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiQuery({
    name: 'foodId',
    required: false,
    description: 'Filter by food ID',
  })
  @ApiQuery({
    name: 'checked',
    required: false,
    description: 'Filter by checked status',
  })
  @ApiQuery({ name: 'unit', required: false, description: 'Filter by unit' })
  @ApiResponse({
    status: 200,
    description: 'Shopping list items retrieved successfully',
    type: MultipleShoppingListItemResponseDto,
  })
  @ApiCrudErrorResponses()
  async findItems(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Query() query: QueryShoppingListItemDto,
  ): Promise<MultipleShoppingListItemResponseDto> {
    return this.shoppingListService.findItems(id, userId, query);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update shopping list',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Shopping list found',
    type: ShoppingListResponseDto,
  })
  @ApiCrudErrorResponses()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateShoppingListDto: UpdateShoppingListDto,
    @CurrentUser('id') userId: string,
  ): Promise<ShoppingListResponseDto> {
    return this.shoppingListService.update(id, updateShoppingListDto, userId);
  }

  @Delete(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete specific shopping list by ID',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Shopping list deleted successfully',
  })
  @ApiCrudErrorResponses()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.shoppingListService.remove(id, userId);
  }
}
