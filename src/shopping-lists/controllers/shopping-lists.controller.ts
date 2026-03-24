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
  ApiOAuth2,
} from '@nestjs/swagger';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { Roles } from 'nest-keycloak-connect';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ShoppingListService } from '../services/shopping-lists.service';
import { CreateShoppingListDto } from '../dto/create-shoppingList.dto';
import {
  MultipleShoppingListResponseDto,
  ShoppingListResponseDto,
} from '../dto/shoppingList-response.dto';
import { UpdateShoppingListDto } from '../dto/update.shoppingList.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
@ApiTags('shopping-lists')
@Controller('shopping-lists')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiOAuth2(['openid', 'profile', 'roles'], 'keycloak-oauth2')
export class ShoppingListsController {
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
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all shopping lists for authenticated user',
  })
  @ApiCrudErrorResponses()
  async findAll(
    @CurrentUser('id') userId: string,
  ): Promise<MultipleShoppingListResponseDto> {
    return this.shoppingListService.findAll(userId);
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
