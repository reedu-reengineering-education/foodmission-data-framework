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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { PantryItemService } from '../services/pantryItem.service';
import { Roles } from 'nest-keycloak-connect';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePantryItemDto } from '../dto/create-pantryItem.dto';
import {
  MultiplePantryItemResponseDto,
  PantryItemResponseDto,
} from '../dto/response-pantryItem.dto';
import { QueryPantryItemDto } from '../dto/query-pantryItem.dto';
import { UpdatePantryItemDto } from '../dto/update-pantryItem.dto';

@ApiTags('pantry-item')
@Controller('pantry-item')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class PantryItemController {
  constructor(private readonly pantryItemService: PantryItemService) {}

  @Post()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Add a new item to Pantry',
    description: 'Creates a new Pantry Item and adds it to the Pantry.',
  })
  @ApiBody({ type: CreatePantryItemDto })
  @ApiResponse({
    status: 201,
    description: 'Pantry item created successfully',
    type: PantryItemResponseDto,
  })
  @ApiCrudErrorResponses()
  async create(
    @Body() createPantryItemDto: CreatePantryItemDto,
    @CurrentUser('id') userId: string,
  ): Promise<PantryItemResponseDto> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.pantryItemService.create(createPantryItemDto, userId);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get pantry items',
    description: 'Retrieve pantry items with optional filtering',
  })
  @ApiQuery({
    name: 'shoppingListId',
    required: false,
    description: 'Filter by pantry ID',
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
    description: 'Pantry items retrieved successfully',
    type: MultiplePantryItemResponseDto,
  })
  @ApiCrudErrorResponses()
  async findAll(
    @Query() query: QueryPantryItemDto,
  ): Promise<MultiplePantryItemResponseDto> {
    return this.pantryItemService.findAll(query);
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get specific pantry item by ID',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'pantry item found',
    type: PantryItemResponseDto,
  })
  @ApiCrudErrorResponses()
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<PantryItemResponseDto> {
    return this.pantryItemService.findById(id, userId);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update pantry item',
    description: 'Update quantity, unit, notes of a pantry item',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdatePantryItemDto })
  @ApiResponse({
    status: 200,
    description: 'Pantry item updated successfully',
    type: PantryItemResponseDto,
  })
  @ApiCrudErrorResponses()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePantryItemDto: UpdatePantryItemDto,
    @CurrentUser('id') userId: string,
  ): Promise<PantryItemResponseDto> {
    return this.pantryItemService.update(id, updatePantryItemDto, userId);
  }

  @Delete(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove item from pantry',
    description: 'Delete a specific pantry item by ID',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'pantry item deleted successfully',
  })
  @ApiCrudErrorResponses()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.pantryItemService.remove(id, userId);
  }
}
