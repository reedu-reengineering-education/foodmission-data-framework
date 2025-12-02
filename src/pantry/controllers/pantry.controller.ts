import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UnauthorizedException,
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
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { PantryService } from '../services/pantry.service';
import { Roles } from 'nest-keycloak-connect';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PantryResponseDto } from '../dto/response-pantry.dto';
import { CreatePantryDto } from '../dto/create-pantry.dto';
import { UpdatePantryDto } from '../dto/update-pantry.dto';

@ApiTags('pantry')
@Controller('pantry')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class PantryController {
  constructor(private readonly pantryService: PantryService) {}

  @Post()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Create a new Pantry',
    description:
      'Creates a new pantry for the authenticated user. Users can have multiple pantries. If a pantry with the same title already exists for the user, returns a conflict error. Requires user or admin role.',
  })
  @ApiBody({ type: CreatePantryDto })
  @ApiResponse({
    status: 201,
    description: 'Pantry created successfully',
    type: PantryResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'A pantry with this title already exists for this user.',
  })
  @ApiCrudErrorResponses()
  async create(
    @Body() createPantryDto: CreatePantryDto,
    @CurrentUser('id') userId: string,
  ): Promise<PantryResponseDto> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.pantryService.create(createPantryDto, userId);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all user pantries',
    description: "Retrieves all pantries for the authenticated user with all items. Returns an empty array if no pantries exist.",
  })
  @ApiResponse({
    status: 200,
    description: 'List of pantries retrieved successfully',
    type: [PantryResponseDto],
  })
  @ApiCrudErrorResponses()
  async getAllPantries(
    @CurrentUser('id') userId: string,
  ): Promise<PantryResponseDto[]> {
    return this.pantryService.getAllPantriesByUserId(userId);
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get pantry by ID',
    description: 'Retrieves a specific pantry by ID for the authenticated user. Only the pantry owner can access it.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Pantry retrieved successfully',
    type: PantryResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No permission - user does not own this pantry',
  })
  @ApiResponse({
    status: 404,
    description: 'Pantry not found',
  })
  @ApiCrudErrorResponses()
  async getPantryById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<PantryResponseDto> {
    return this.pantryService.getPantryById(id, userId);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update pantry',
    description:
      'Updates the pantry title. Only the pantry owner can update their pantry.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Pantry updated successfully',
    type: PantryResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No permission - user does not own this pantry',
  })
  @ApiCrudErrorResponses()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePantryDto: UpdatePantryDto,
    @CurrentUser('id') userId: string,
  ): Promise<PantryResponseDto> {
    return this.pantryService.update(id, updatePantryDto, userId);
  }

  @Delete(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete pantry',
    description:
      'Deletes a specific pantry by ID. Only the pantry owner can delete their pantry. All pantry items will be deleted as well (cascade delete).',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Pantry deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'No permission - user does not own this pantry',
  })
  @ApiResponse({
    status: 404,
    description: 'Pantry not found',
  })
  @ApiCrudErrorResponses()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.pantryService.remove(id, userId);
  }
}
