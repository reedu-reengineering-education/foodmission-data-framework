import {
  Body,
  Controller,
  Get,
  Delete,
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
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { Roles } from 'nest-keycloak-connect';
import { ChallengesService } from '../services/challenges.service';
import { ChallengeResponseDto } from '../dto/response-challange.dto';
import { UpdateChallengeDto } from '../dto/update-challenge.dto';
import { CreateChallengeDto } from '../dto/create-challenge.dto';
import { ListChallengesQueryDto } from '../dto/list-challenges-query.dto';
import { ChallengeProgressResponseDto } from '../dto/response-challenge-progress.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChallengeProgressService } from '../services/challenge-progress.service';
import { LearningLangQueryDto } from '../../learning/dto/learning-lang-query.dto';
import { PaginatedResponseDto } from '../../common/dto/api-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { extractKeycloakRoles } from '../../common/utils/keycloak-roles.util';

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
  @ApiOperation({
    summary: 'Create a new Challenge',
    description: 'Creates a new challenge as an Admin',
  })
  @ApiBody({ type: CreateChallengeDto })
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
    @Body() createChallengeDto: CreateChallengeDto,
  ): Promise<ChallengeResponseDto> {
    return this.challengeService.create(createChallengeDto);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all challenges',
    description:
      'Retrieves challenges filtered by dimension/level/availability. Non-admins only see available challenges.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all challenges retrieved successfully',
    type: [ChallengeResponseDto],
  })
  @ApiCrudErrorResponses()
  async getAll(
    @Query() query: ListChallengesQueryDto,
    @Req()
    req: {
      user?: { resource_access?: Record<string, { roles?: string[] }> };
    },
    @CurrentUser('id') userId: string,
  ): Promise<ChallengeResponseDto[]> {
    const isAdmin = extractKeycloakRoles(req.user ?? {}).includes('admin');
    return this.challengeService.getAll(query, { isAdmin, userId });
  }

  @Get('progress/all')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List all challenge progress rows (admin, paginated)',
    description:
      'Returns paginated challenge progress for all users. Use instead of embedded progress on challenge list.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated challenge progress retrieved successfully',
  })
  @ApiCrudErrorResponses()
  async getAllProgressPaginated(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ChallengeProgressResponseDto>> {
    return this.challengeProgressService.getAllPaginated(query);
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

  @Get(':codeOrId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get challenge by UUID or code',
    description: 'Retrieves a specific challenge by its ID or business code.',
  })
  @ApiParam({ name: 'codeOrId', type: 'string' })
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
    @Param('codeOrId') codeOrId: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<ChallengeResponseDto> {
    return this.challengeService.getChallengeById(codeOrId, query.lang);
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
    @Body() updateChallengeDto: UpdateChallengeDto,
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
}
