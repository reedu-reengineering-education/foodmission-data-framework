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
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { Roles } from 'nest-keycloak-connect';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ShoppingListItemService } from '../services/shopping-list-items.service';
import {
  CreateShoppingListItemDto,
  CreateShoppingListItemBodyDto,
} from '../dto/create-shoppingListItem.dto';
import {
  MultipleShoppingListItemResponseDto,
  ShoppingListItemResponseDto,
} from '../dto/response-shoppingListItem.dto';
import {
  QueryShoppingListItemDto,
  QueryShoppingListItemsFilterDto,
} from '../dto/query-shoppingListItem.dto';
import { UpdateShoppingListItemDto } from '../dto/update-shoppingListItem.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { Unit } from '@prisma/client';

@ApiTags('shopping-list-items')
@Controller('shopping-lists/:shoppingListId/items')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class ShoppingListItemsController {
  constructor(
    private readonly shoppingListItemService: ShoppingListItemService,
  ) {}

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List items in a shopping list',
    description:
      'Returns all items for the shopping list, with optional filters.',
  })
  @ApiParam({ name: 'shoppingListId', format: 'uuid' })
  @ApiQuery({
    name: 'foodId',
    required: false,
    description: 'Filter by food ID',
    type: String,
  })
  @ApiQuery({
    name: 'checked',
    required: false,
    description: 'Filter by checked status',
    type: Boolean,
  })
  @ApiQuery({
    name: 'unit',
    required: false,
    description: 'Filter by unit',
    enum: Unit,
  })
  @ApiResponse({
    status: 200,
    description: 'Shopping list items retrieved successfully',
    type: MultipleShoppingListItemResponseDto,
  })
  @ApiCrudErrorResponses()
  async findByShoppingList(
    @Param('shoppingListId', ParseUUIDPipe) shoppingListId: string,
    @Query() query: QueryShoppingListItemsFilterDto,
    @CurrentUser('id') userId: string,
  ): Promise<MultipleShoppingListItemResponseDto> {
    const fullQuery = { ...query, shoppingListId } as QueryShoppingListItemDto;
    return this.shoppingListItemService.findByShoppingList(
      shoppingListId,
      userId,
      fullQuery,
    );
  }

  @Post()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Add a new item to shopping list',
    description:
      'Creates a new ShoppingListItem under the given shopping list. Requires user or admin role.',
  })
  @ApiParam({ name: 'shoppingListId', format: 'uuid' })
  @ApiBody({ type: CreateShoppingListItemBodyDto })
  @ApiResponse({
    status: 201,
    description: 'Shopping list item created successfully',
    type: ShoppingListItemResponseDto,
  })
  @ApiCrudErrorResponses()
  async create(
    @Param('shoppingListId', ParseUUIDPipe) shoppingListId: string,
    @Body() body: CreateShoppingListItemBodyDto,
    @CurrentUser('id') userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    const dto = Object.assign(new CreateShoppingListItemDto(), {
      ...body,
      shoppingListId,
    });
    return this.shoppingListItemService.create(dto, userId);
  }

  @Delete('clear-checked')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Clear all checked items from shopping list',
    description: 'Remove all checked items from a specific shopping list',
  })
  @ApiParam({ name: 'shoppingListId', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Checked items cleared successfully',
  })
  @ApiCrudErrorResponses()
  async clearCheckedItems(
    @Param('shoppingListId', ParseUUIDPipe) shoppingListId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.shoppingListItemService.clearCheckedItems(
      shoppingListId,
      userId,
    );
  }

  @Get(':itemId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get specific shopping list item by ID',
  })
  @ApiParam({ name: 'shoppingListId', format: 'uuid' })
  @ApiParam({ name: 'itemId', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Shopping list item found',
    type: ShoppingListItemResponseDto,
  })
  @ApiCrudErrorResponses()
  async findById(
    @Param('shoppingListId', ParseUUIDPipe) shoppingListId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    return this.shoppingListItemService.findById(
      itemId,
      userId,
      shoppingListId,
    );
  }

  @Patch(':itemId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update shopping list item',
    description:
      'Update quantity, unit, notes, or checked status of a shopping list item',
  })
  @ApiParam({ name: 'shoppingListId', format: 'uuid' })
  @ApiParam({ name: 'itemId', format: 'uuid' })
  @ApiBody({ type: UpdateShoppingListItemDto })
  @ApiResponse({
    status: 200,
    description: 'Shopping list item updated successfully',
    type: ShoppingListItemResponseDto,
  })
  @ApiCrudErrorResponses()
  async update(
    @Param('shoppingListId', ParseUUIDPipe) shoppingListId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() updateShoppingListItemDto: UpdateShoppingListItemDto,
    @CurrentUser('id') userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    return this.shoppingListItemService.update(
      itemId,
      updateShoppingListItemDto,
      userId,
      shoppingListId,
    );
  }

  @Patch(':itemId/toggle-checked')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Toggle checked status of shopping list item',
    description: 'Quick endpoint to toggle the checked status of an item',
  })
  @ApiParam({ name: 'shoppingListId', format: 'uuid' })
  @ApiParam({ name: 'itemId', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Item checked status toggled successfully',
    type: ShoppingListItemResponseDto,
  })
  @ApiCrudErrorResponses()
  async toggleChecked(
    @Param('shoppingListId', ParseUUIDPipe) shoppingListId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    return this.shoppingListItemService.toggleChecked(
      itemId,
      userId,
      shoppingListId,
    );
  }

  @Delete(':itemId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove item from shopping list',
    description: 'Delete a specific shopping list item by ID',
  })
  @ApiParam({ name: 'shoppingListId', format: 'uuid' })
  @ApiParam({ name: 'itemId', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Shopping list item deleted successfully',
  })
  @ApiCrudErrorResponses()
  async remove(
    @Param('shoppingListId', ParseUUIDPipe) shoppingListId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.shoppingListItemService.remove(itemId, userId, shoppingListId);
  }
}
