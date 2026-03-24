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
import { ChallengesService } from '../services/challenges.service';
import { ChallengeResponseDto } from '../dto/response-challange.dto';
import { UpdateChallengesDto } from '../dto/update-challenges.dto';
import { CreateChallengesDto } from '../dto/create-challenges.dto';
import { ChallengeProgressResponseDto } from '../dto/response-challenge-progress.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChallengeProgressService } from '../services/challenge-progress.service';

@ApiTags('challenges')
@Controller('challenges')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class ChallengesController {
  constructor(
    private readonly challengeService: ChallengesService,
    private readonly challengeProgressService: ChallengeProgressService,
  ) {}

  @Post()
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Create a new Challenge',
    description:
      'Creates a new challenge as an Admin. Automatically creates a ChallengeProgress entry for every existing user.',
  })
  @ApiBody({ type: CreateChallengesDto })
  @ApiResponse({
    status: 201,
    description: 'Challenge created successfully',
    type: ChallengeResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'A challenge with this title already exists.',
  })
  @ApiCrudErrorResponses()
  async create(
    @Body() createChallengeDto: CreateChallengesDto,
  ): Promise<ChallengeResponseDto> {
    return this.challengeService.create(createChallengeDto);
  }

  @Get()
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all challenges',
    description: 'Retrieves all challenges. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all challenges retrieved successfully',
    type: [ChallengeResponseDto],
  })
  @ApiCrudErrorResponses()
  async getAll(): Promise<ChallengeResponseDto[]> {
    return this.challengeService.getAll();
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get challenge by ID',
    description: 'Retrieves a specific challenge by its ID.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Challenge retrieved successfully',
    type: ChallengeResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Challenge not found',
  })
  @ApiCrudErrorResponses()
  async getChallengeById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ChallengeResponseDto> {
    return this.challengeService.getChallengeById(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update challenge',
    description:
      'Updates challenge metadata like title, description, dates or availability. Admin only.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Challenge updated successfully',
    type: ChallengeResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Challenge not found',
  })
  @ApiCrudErrorResponses()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateChallengeDto: UpdateChallengesDto,
  ): Promise<ChallengeResponseDto> {
    return this.challengeService.update(id, updateChallengeDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete challenge',
    description:
      'Deletes a specific challenge by ID including all its progress entries. Admin only.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Challenge deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Challenge not found',
  })
  @ApiCrudErrorResponses()
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.challengeService.delete(id);
  }

  @Get('/progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all challenge progresses for the current user',
    description:
      'Retrieves all challenge progresses for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of challenge progresses retrieved successfully',
    type: [ChallengeProgressResponseDto],
  })
  @ApiCrudErrorResponses()
  async getAllProgress(
    @CurrentUser('id') userId: string,
  ): Promise<ChallengeProgressResponseDto[]> {
    return this.challengeProgressService.getAllChallengesByUserId(userId);
  }
}
