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
      'Creates a new pantry in the database. Requires user or admin role.',
  })
  @ApiBody({ type: CreatePantryDto })
  @ApiResponse({
    status: 201,
    description: 'pantry created successfully',
    type: PantryResponseDto,
  })
  @ApiCrudErrorResponses()
  async create(
    @Body() createPantryDto: CreatePantryDto,
    @CurrentUser('id') userId: string,
  ): Promise<PantryResponseDto> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.pantryService.create(createPantryDto);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user pantry',
    description: "Retrieves the authenticated user's pantry with all items. Returns null if no pantry exists.",
  })
  @ApiResponse({
    status: 200,
    description: 'Pantry retrieved successfully',
    type: PantryResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'No pantry found for user',
    schema: {
      type: 'null',
      example: null,
    },
  })
  @ApiCrudErrorResponses()
  async getMyPantry(
    @CurrentUser('id') userId: string,
  ): Promise<PantryResponseDto | null> {
    return this.pantryService.getPantryByUserId(userId);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update pantry',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'pantry found',
    type: PantryResponseDto,
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
    summary: 'Delete specific pantry by ID',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Pantry found',
    type: PantryResponseDto,
  })
  @ApiCrudErrorResponses()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.pantryService.remove(id, userId);
  }
}
