import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
      'Creates a new pantry for the authenticated user. Each user can only have one pantry. If a pantry already exists for the user, returns a conflict error. Requires user or admin role.',
  })
  @ApiBody({ type: CreatePantryDto })
  @ApiResponse({
    status: 201,
    description: 'Pantry created successfully',
    type: PantryResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'User already has a pantry.',
  })
  @ApiCrudErrorResponses()
  async create(
    @Body() createPantryDto: CreatePantryDto,
    @CurrentUser('id') userId: string,
  ): Promise<PantryResponseDto> {
    return this.pantryService.create(createPantryDto, userId);
  }

  @Patch()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update user pantry',
    description: 'Updates the pantry for the authenticated user.',
  })
  @ApiBody({ type: UpdatePantryDto })
  @ApiResponse({
    status: 200,
    description: 'Pantry updated successfully',
    type: PantryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Pantry not found',
  })
  @ApiCrudErrorResponses()
  async updateUserPantry(
    @Body() updatePantryDto: UpdatePantryDto,
    @CurrentUser('id') userId: string,
  ): Promise<PantryResponseDto> {
    return this.pantryService.updateUserPantry(updatePantryDto, userId);
  }

  @Delete()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete user pantry',
    description: 'Deletes the pantry for the authenticated user.',
  })
  @ApiResponse({
    status: 204,
    description: 'Pantry deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Pantry not found',
  })
  @ApiCrudErrorResponses()
  async deleteUserPantry(
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.pantryService.deleteUserPantry(userId);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user pantry',
    description: 'Retrieves the pantry for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pantry retrieved successfully',
    type: PantryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Pantry not found',
  })
  @ApiCrudErrorResponses()
  async getUserPantry(
    @CurrentUser('id') userId: string,
  ): Promise<PantryResponseDto> {
    return this.pantryService.getPantryByUserId(userId);
  }
}
