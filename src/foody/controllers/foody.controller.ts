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
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { extractKeycloakRoles } from '../../common/utils/keycloak-roles.util';
import { CreateFoodyItemDto } from '../dto/create-foody-item.dto';
import { QueryFoodyItemsDto } from '../dto/query-foody-items.dto';
import {
  FoodyItemResponseDto,
  FoodyLoadoutResponseDto,
  FoodyPurchaseResponseDto,
} from '../dto/response-foody-item.dto';
import { UpdateFoodyItemDto } from '../dto/update-foody-item.dto';
import { FoodyService } from '../services/foody.service';

@ApiTags('foody')
@Controller('foody')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class FoodyController {
  constructor(private readonly foodyService: FoodyService) {}

  @Get('items')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List Foody personalization items',
    description:
      'Returns the Foody catalog (antennas, ears, glasses — six items each) ' +
      'with `owned`, `locked` and `equipped` resolved for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Items retrieved successfully',
    type: [FoodyItemResponseDto],
  })
  @ApiCrudErrorResponses()
  async listItems(
    @Query() query: QueryFoodyItemsDto,
    @CurrentUser('id') userId: string,
    @Req()
    req: {
      user?: { resource_access?: Record<string, { roles?: string[] }> };
    },
  ): Promise<FoodyItemResponseDto[]> {
    const isAdmin = extractKeycloakRoles(req.user ?? {}).includes('admin');
    return this.foodyService.listForUser(userId, query, { isAdmin });
  }

  @Get('loadout')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get the currently worn Foody items',
    description:
      'Returns the equipped item per category (null when nothing is worn).',
  })
  @ApiResponse({
    status: 200,
    description: 'Loadout retrieved successfully',
    type: FoodyLoadoutResponseDto,
  })
  @ApiCrudErrorResponses()
  async getLoadout(
    @CurrentUser('id') userId: string,
  ): Promise<FoodyLoadoutResponseDto> {
    return this.foodyService.getLoadout(userId);
  }

  @Post('items/:codeOrId/purchase')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Buy a Foody item',
    description:
      'Debits the item cost from the user points wallet and grants ownership. ' +
      'Retrying a purchase never charges twice.',
  })
  @ApiParam({
    name: 'codeOrId',
    type: 'string',
    description: 'Foody item UUID or code (e.g. GLASSES_3)',
    example: 'GLASSES_3',
  })
  @ApiResponse({
    status: 201,
    description: 'Item purchased successfully',
    type: FoodyPurchaseResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Not enough points' })
  @ApiResponse({ status: 404, description: 'Foody item not found' })
  @ApiResponse({ status: 409, description: 'Foody item already owned' })
  @ApiCrudErrorResponses()
  async purchase(
    @Param('codeOrId') codeOrId: string,
    @CurrentUser('id') userId: string,
  ): Promise<FoodyPurchaseResponseDto> {
    return this.foodyService.purchase(userId, codeOrId);
  }

  @Post('items/:codeOrId/equip')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Wear an owned Foody item',
    description:
      'Equips the item and unequips whatever the user wore in the same category.',
  })
  @ApiParam({
    name: 'codeOrId',
    type: 'string',
    description: 'Foody item UUID or code (e.g. GLASSES_3)',
    example: 'GLASSES_3',
  })
  @ApiResponse({
    status: 201,
    description: 'Item equipped successfully',
    type: FoodyItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Foody item not found' })
  @ApiResponse({ status: 409, description: 'Foody item not owned' })
  @ApiCrudErrorResponses()
  async equip(
    @Param('codeOrId') codeOrId: string,
    @CurrentUser('id') userId: string,
  ): Promise<FoodyItemResponseDto> {
    return this.foodyService.equip(userId, codeOrId);
  }

  @Delete('items/:codeOrId/equip')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Take off a worn Foody item',
    description: 'Unequips the item; ownership is kept.',
  })
  @ApiParam({
    name: 'codeOrId',
    type: 'string',
    description: 'Foody item UUID or code (e.g. GLASSES_3)',
    example: 'GLASSES_3',
  })
  @ApiResponse({
    status: 200,
    description: 'Item unequipped successfully',
    type: FoodyItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Foody item not found' })
  @ApiResponse({ status: 409, description: 'Foody item not owned' })
  @ApiCrudErrorResponses()
  async unequip(
    @Param('codeOrId') codeOrId: string,
    @CurrentUser('id') userId: string,
  ): Promise<FoodyItemResponseDto> {
    return this.foodyService.unequip(userId, codeOrId);
  }

  @Post('items')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a Foody item',
    description: 'Adds a catalog item. Admin only.',
  })
  @ApiBody({ type: CreateFoodyItemDto })
  @ApiResponse({
    status: 201,
    description: 'Item created successfully',
    type: FoodyItemResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'An item with this code or type/slot already exists',
  })
  @ApiCrudErrorResponses()
  async create(
    @Body() createFoodyItemDto: CreateFoodyItemDto,
  ): Promise<FoodyItemResponseDto> {
    return this.foodyService.create(createFoodyItemDto);
  }

  @Patch('items/:id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a Foody item',
    description: 'Updates a catalog item. Admin only.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Item updated successfully',
    type: FoodyItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Foody item not found' })
  @ApiCrudErrorResponses()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFoodyItemDto: UpdateFoodyItemDto,
  ): Promise<FoodyItemResponseDto> {
    return this.foodyService.update(id, updateFoodyItemDto);
  }

  @Delete('items/:id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a Foody item',
    description:
      'Deletes a catalog item and every user ownership row for it (cascade). Admin only.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Foody item not found' })
  @ApiCrudErrorResponses()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.foodyService.remove(id);
  }
}
