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
import { PantryItemService } from '../services/pantry-items.service';
import { Roles } from 'nest-keycloak-connect';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreatePantryItemDto,
  CreatePantryItemBodyDto,
} from '../dto/create-pantry-item.dto';
import {
  MultiplePantryItemResponseDto,
  PantryItemResponseDto,
} from '../dto/response-pantry-item.dto';
import { QueryPantryItemsFilterDto } from '../dto/query-pantry-item.dto';
import { UpdatePantryItemDto } from '../dto/update-pantry-item.dto';
import { Unit } from '@prisma/client';
import { ExpiredPantryItemDto } from '../dto/expired-pantry-item.dto';

@ApiTags('pantry')
@Controller('pantry/:pantryId/items')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class PantryItemsController {
  constructor(private readonly pantryItemService: PantryItemService) {}

  @Post()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Add a new item to a pantry',
    description:
      'Creates a new Pantry Item and adds it to your dedicated pantry. The unit field is optional and defaults to PIECES if not provided. Requires user or admin role.',
  })
  @ApiParam({
    name: 'pantryId',
    description: 'UUID of the pantry',
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            quantity: { type: 'number', example: 2, minimum: 0.01 },
            unit: { type: 'string', example: 'KG', default: 'PIECES' },
            notes: { type: 'string', example: 'Store in cool place' },
            location: {
              type: 'string',
              example: 'Pantry shelf A',
              description: 'Optional location of the item within your pantry.',
            },
            expiryDate: {
              type: 'string',
              format: 'date',
              example: '2027-02-02',
            },
            foodId: {
              type: 'string',
              format: 'uuid',
              description: 'UUID of the food item (OpenFoodFacts).',
            },
          },
          required: ['foodId', 'quantity'],
        },
        {
          type: 'object',
          properties: {
            quantity: { type: 'number', example: 2, minimum: 0.01 },
            unit: { type: 'string', example: 'KG', default: 'PIECES' },
            notes: { type: 'string', example: 'Store in cool place' },
            location: {
              type: 'string',
              example: 'Pantry shelf A',
              description: 'Optional location of the item within your pantry.',
            },
            expiryDate: {
              type: 'string',
              format: 'date',
              example: '2027-02-02',
            },
            foodCategoryId: {
              type: 'string',
              format: 'uuid',
              description: 'UUID of the food category (NEVO generic).',
            },
          },
          required: ['foodCategoryId', 'quantity'],
        },
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Pantry item created successfully',
    type: PantryItemResponseDto,
  })
  @ApiCrudErrorResponses()
  async create(
    @Param('pantryId', ParseUUIDPipe) pantryId: string,
    @Body() body: CreatePantryItemBodyDto,
    @CurrentUser('id') userId: string,
  ) {
    const createPantryItemDto = Object.assign(new CreatePantryItemDto(), body);
    return this.pantryItemService.create(
      createPantryItemDto,
      userId,
      undefined,
      pantryId,
    );
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get pantry items',
    description:
      'Retrieve pantry items from your dedicated pantry. Optional filtering by foodId, foodCategoryId, unit, or expiryDate.',
  })
  @ApiQuery({
    name: 'foodId',
    required: false,
    description: 'Filter by food ID (UUID)',
    type: String,
  })
  @ApiQuery({
    name: 'foodCategoryId',
    required: false,
    description: 'Filter by food category ID (UUID)',
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
  @ApiParam({
    name: 'pantryId',
    description: 'UUID of the pantry',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Pantry items retrieved successfully',
    type: MultiplePantryItemResponseDto,
  })
  @ApiCrudErrorResponses()
  async findAll(
    @Param('pantryId', ParseUUIDPipe) pantryId: string,
    @Query() query: QueryPantryItemsFilterDto,
    @CurrentUser('id') userId: string,
  ): Promise<MultiplePantryItemResponseDto> {
    return this.pantryItemService.findAll(query, userId, pantryId);
  }

  @Get('expired')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Detect expired pantry items',
    description:
      "Find all expired items in the user's pantry. Returns suggested waste entries that can be used with the food waste batch creation endpoint.",
  })
  @ApiParam({
    name: 'pantryId',
    description: 'UUID of the pantry',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Expired items detected',
    type: [ExpiredPantryItemDto],
  })
  @ApiCrudErrorResponses()
  async findExpired(
    @Param('pantryId', ParseUUIDPipe) pantryId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ExpiredPantryItemDto[]> {
    return this.pantryItemService.detectExpiredItems(userId, pantryId);
  }

  @Get(':itemId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get specific pantry item by ID',
  })
  @ApiParam({
    name: 'pantryId',
    description: 'UUID of the pantry',
    format: 'uuid',
  })
  @ApiParam({ name: 'itemId', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'pantry item found',
    type: PantryItemResponseDto,
  })
  @ApiCrudErrorResponses()
  async findById(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser('id') userId: string,
  ): Promise<PantryItemResponseDto> {
    return this.pantryItemService.findById(itemId, userId);
  }

  @Patch(':itemId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update pantry item',
    description:
      'Update quantity, unit, notes, or expiry date of a pantry item. All fields are optional.',
  })
  @ApiParam({
    name: 'pantryId',
    description: 'UUID of the pantry',
    format: 'uuid',
  })
  @ApiParam({ name: 'itemId', format: 'uuid' })
  @ApiBody({ type: UpdatePantryItemDto })
  @ApiResponse({
    status: 200,
    description: 'Pantry item updated successfully',
    type: PantryItemResponseDto,
  })
  @ApiCrudErrorResponses()
  async update(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() updatePantryItemDto: UpdatePantryItemDto,
    @CurrentUser('id') userId: string,
  ): Promise<PantryItemResponseDto> {
    return this.pantryItemService.update(itemId, updatePantryItemDto, userId);
  }

  @Delete(':itemId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove item from pantry',
    description: 'Delete a specific pantry item by ID',
  })
  @ApiParam({
    name: 'pantryId',
    description: 'UUID of the pantry',
    format: 'uuid',
  })
  @ApiParam({ name: 'itemId', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'pantry item deleted successfully',
  })
  @ApiCrudErrorResponses()
  async remove(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.pantryItemService.remove(itemId, userId);
  }
}
