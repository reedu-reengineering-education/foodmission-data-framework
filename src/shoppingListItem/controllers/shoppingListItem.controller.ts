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
  Request,
  UseGuards,
  UnauthorizedException,
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
import { Public, Roles } from 'nest-keycloak-connect';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ShoppingListItemService } from '../services/shoppingListItem.service';
import { CreateShoppingListItemDto } from '../dto/create-soppingListItem.dto';
import { QueryShoppingListItemDto } from '../dto/query-soppingListItem.dto';
import {
  MultipleShoppingListItemResponseDto,
  ShoppingListItemResponseDto,
} from '../dto/response-soppingListItem.dto';
import { UpdateShoppingListItemDto } from '../dto/update-soppingListItem.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataBaseAuthGuard } from '../../common/guards/auth.guards';

@ApiTags('shopping-list-items')
@Controller('shopping-list-items')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class ShoppingListItemController {
  constructor(
    private readonly shoppingListItemService: ShoppingListItemService,
  ) {}

  @Post()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Add a new item to shopping list',
    description:
      'Creates a new ShoppingListItem and adds it to the specified shopping list. Requires user or admin role.',
  })
  @ApiBody({ type: CreateShoppingListItemDto })
  @ApiResponse({
    status: 201,
    description: 'Shopping list item created successfully',
    type: ShoppingListItemResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or duplicate item',
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
    description: 'Shopping list or food item not found',
  })
  async create(
    @Body() createShoppingListItemDto: CreateShoppingListItemDto,
    @CurrentUser('id') userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.shoppingListItemService.create(
      createShoppingListItemDto,
      userId,
    );
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get shopping list items',
    description: 'Retrieve shopping list items with optional filtering',
  })
  @ApiQuery({
    name: 'shoppingListId',
    required: false,
    description: 'Filter by shopping list ID',
  })
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
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Shopping list items retrieved successfully',
    type: MultipleShoppingListItemResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  async findAll(
    @Query() query: QueryShoppingListItemDto,
  ): Promise<MultipleShoppingListItemResponseDto> {
    return this.shoppingListItemService.findAll(query);
  }

  @Get(':shoppingListId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all items from a specific shopping list',
    description: 'Retrieve all items belonging to a specific shopping list',
  })
  @ApiParam({ name: 'shoppingListId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Shopping list items retrieved successfully',
    type: MultipleShoppingListItemResponseDto,
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
    description: 'Shopping list not found',
  })
  async findByShoppingList(
    @Param('shoppingListId', ParseUUIDPipe) shoppingListId: string,
    @CurrentUser('id') userId: string,
  ): Promise<MultipleShoppingListItemResponseDto> {
    return this.shoppingListItemService.findByShoppingList(
      shoppingListId,
      userId,
    );
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get specific shopping list item by ID',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Shopping list item found',
    type: ShoppingListItemResponseDto,
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
    description: 'Shopping list item not found',
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ShoppingListItemResponseDto> {
    const userId = req.user?.sub;
    return this.shoppingListItemService.findById(id, userId);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update shopping list item',
    description:
      'Update quantity, unit, notes, or checked status of a shopping list item',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdateShoppingListItemDto })
  @ApiResponse({
    status: 200,
    description: 'Shopping list item updated successfully',
    type: ShoppingListItemResponseDto,
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
    description: 'Shopping list item not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateShoppingListItemDto: UpdateShoppingListItemDto,
    @CurrentUser('id') userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    return this.shoppingListItemService.update(
      id,
      updateShoppingListItemDto,
      userId,
    );
  }

  @Patch(':id/toggle-checked')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Toggle checked status of shopping list item',
    description: 'Quick endpoint to toggle the checked status of an item',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Item checked status toggled successfully',
    type: ShoppingListItemResponseDto,
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
    description: 'Shopping list item not found',
  })
  async toggleChecked(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    return this.shoppingListItemService.toggleChecked(id, userId);
  }

  @Delete(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove item from shopping list',
    description: 'Delete a specific shopping list item by ID',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Shopping list item deleted successfully',
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
    description: 'Shopping list item not found',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.shoppingListItemService.remove(id, userId);
  }

  @Delete(':shoppingListId/clear-checked')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Clear all checked items from shopping list',
    description: 'Remove all checked items from a specific shopping list',
  })
  @ApiParam({ name: 'shoppingListId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Checked items cleared successfully',
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
    description: 'Shopping list not found',
  })
  async clearCheckedItems(
    @Param('shoppingListId', ParseUUIDPipe) shoppingListId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.shoppingListItemService.clearCheckedItems(
      shoppingListId,
      userId,
    );
  }
}
