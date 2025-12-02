import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
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
import { Unit } from '@prisma/client';

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
    description:
      'Creates a new Pantry Item and adds it to the specified pantry. The pantryId must be provided in the request body and must belong to the authenticated user. Users can have multiple pantries. Requires user or admin role.',
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
    description:
      'Retrieve pantry items from a specific pantry. The pantryId must be provided as a query parameter and must belong to the authenticated user. Optional filtering by foodId, unit, or expiryDate.',
  })
  @ApiQuery({
    name: 'pantryId',
    required: true,
    description: 'The ID of the pantry to get items from (UUID)',
    type: String,
  })
  @ApiQuery({
    name: 'foodId',
    required: false,
    description: 'Filter by food ID (UUID)',
    type: String,
  })
  @ApiQuery({
    name: 'unit',
    required: false,
    description: 'Filter by unit (PIECES, G, KG, ML, L, CUPS)',
    enum: Unit,
  })
  @ApiQuery({
    name: 'expiryDate',
    required: false,
    description: 'Filter by expiry date (ISO date string)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Pantry items retrieved successfully',
    type: MultiplePantryItemResponseDto,
  })
  @ApiCrudErrorResponses()
  async findAll(
    @Query() query: QueryPantryItemDto,
    @Req() request: Request,
    @CurrentUser('id') userId: string,
  ): Promise<MultiplePantryItemResponseDto> {
    const url = request.originalUrl || request.url;
    const pathname = url.split('?')[0];

    if (pathname.endsWith('/pantry-item/')) {
      throw new BadRequestException(
        'Invalid request path. Use GET /api/v1/pantry-item (without trailing slash) to list all items, or GET /api/v1/pantry-item/:id to get a specific item.',
      );
    }

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.pantryItemService.findAll(query, userId);
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
    description:
      'Update quantity, unit, notes, or expiry date of a pantry item. All fields are optional.',
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
