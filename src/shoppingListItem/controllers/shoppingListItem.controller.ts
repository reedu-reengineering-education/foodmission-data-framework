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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { Roles } from 'nest-keycloak-connect';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ShoppingListItemService } from '../services/shoppingListItem.service';
import { CreateShoppingListItemDto } from '../dto/create-shoppingListItem.dto';
import { ShoppingListItemResponseDto } from '../dto/response-shoppingListItem.dto';
import { UpdateShoppingListItemDto } from '../dto/update-shoppingListItem.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

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
  @ApiCrudErrorResponses()
  async create(
    @Body() createShoppingListItemDto: CreateShoppingListItemDto,
    @CurrentUser('id') userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    return this.shoppingListItemService.create(
      createShoppingListItemDto,
      userId,
    );
  }

  @Get('item/:id')
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
  @ApiCrudErrorResponses()
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ShoppingListItemResponseDto> {
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
  @ApiCrudErrorResponses()
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
  @ApiCrudErrorResponses()
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
  @ApiCrudErrorResponses()
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
}
