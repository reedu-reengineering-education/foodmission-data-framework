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

import { Roles } from 'nest-keycloak-connect';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePantryDto } from 'src/pantry/dto/create-pantry.dto';
import { PantryResponseDto } from 'src/pantry/dto/response-pantry.dto';
import { UpdatePantryDto } from 'src/pantry/dto/query-pantry.dto';


@ApiTags('challenges')
@Controller('challenges')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}
  @Post()
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Create a new Challenge',
    description:
      'Creates a new challenge as an Admin',
  })
  @ApiBody({ type: CreateChallengeDto })
  @ApiResponse({
    status: 201,
    description: 'Challenge created successfully',
    type: ChallengeResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'A challenge with this title already exist.',
  })
  @ApiCrudErrorResponses()
  async create(
    @Body() createChallengeDto: CreateChallengeDto,
    @CurrentUser('id') userId: string,
  ): Promise<ChallengeResponseDto> {
    return this.challengesService.create(createChallengeDto, userId);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all user challenges',
    description:
      'Retrieves all challenges for the authenticated user. Returns an empty array if no challenges exist.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of challenges retrieved successfully',
    type: [ChallengeResponseDto],
  })
  @ApiCrudErrorResponses()
  async getAllChallenges(
    @CurrentUser('id') userId: string,
  ): Promise<ChallengeResponseDto[]> {
    return this.challengesService.getAllChallengesByUserId(userId);
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get challenge by ID',
    description:
      'Retrieves a specific challenge by ID for the authenticated user. Only the challenge owner can access it.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Challenge retrieved successfully',
    type: ChallengeResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No permission',
  })
  @ApiResponse({
    status: 404,
    description: 'Challenge not found',
  })
  @ApiCrudErrorResponses()
  async getChallengeById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ChallengeResponseDto> {
    return this.challengesService.getChallengeById(id, userId);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update challenge',
    description:
      'Updates the challenge progress.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Challenge updated successfully',
    type: ChallengeResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No permission - user does not own this challenge',
  })
  @ApiCrudErrorResponses()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateChallengeDto: UpdateChallengeDto,
    @CurrentUser('id') userId: string,
  ): Promise<ChallengeResponseDto> {
    return this.challengesService.update(id, updateChallengeDto, userId);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete challenge',
    description:
      'Deletes a specific challenge by ID. Only the admin can delete challenges. All related data will be deleted as well (cascade delete).',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Challenge deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'No permission - user does not own this challenge',
  })
  @ApiResponse({
    status: 404,
    description: 'Challenge not found',
  })
  @ApiCrudErrorResponses()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.challengesService.remove(id, userId);
  }
}
