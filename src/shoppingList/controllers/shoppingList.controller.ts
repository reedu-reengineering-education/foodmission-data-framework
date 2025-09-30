import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UnauthorizedException,
  UseGuards,
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
import { ShoppingListService } from '../services/shoppingList.service';
import { CreateShoppingListDto } from '../dto/create-shoppingList.dto';
import {
  MultipleShoppingListResponseDto,
  ShoppingListResponseDto,
} from '../dto/shoppingList-response.dto';
import { UpdateShoppingListDto } from '../dto/update.shoppingList.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { DataBaseAuthGuard } from '../../common/guards/auth.guards';

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
    @Body() createShoppingListDto: CreateShoppingListDto,
    @CurrentUser('id') userId: string,
  ): Promise<ShoppingListResponseDto> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
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
    description: 'Shopping list found',
    type: ShoppingListResponseDto,
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
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.shoppingListService.remove(id);
  }
}
