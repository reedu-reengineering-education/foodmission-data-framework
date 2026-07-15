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
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { Roles } from 'nest-keycloak-connect';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import { LangQueryDto } from '../../i18n/dto/lang-query.dto';
import { ChallengesService } from '../services/challenges.service';
import { ChallengeResponseDto } from '../dto/response-challange.dto';
import { UpdateChallengeDto } from '../dto/update-challenge.dto';
import { CreateChallengeDto } from '../dto/create-challenge.dto';
import { ChallengeProgressResponseDto } from '../dto/response-challenge-progress.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChallengeProgressService } from '../services/challenge-progress.service';

@ApiTags('challenges')
@Controller('challenges')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
@ApiQuery({
  name: 'lang',
  required: false,
  type: String,
  enum: SUPPORTED_LOCALES,
  description: `Optional locale override for translated challenge copy. Defaults to ${DEFAULT_LOCALE}.`,
})
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
    description:
      'Creates a new challenge as an Admin. Automatically creates a ChallengeProgress entry for every existing user.',
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

  @Get('progress')
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
    @Query() query: LangQueryDto,
  ): Promise<ChallengeProgressResponseDto[]> {
    return this.challengeProgressService.getAllChallengesByUserId(
      userId,
      query.lang,
    );
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get daily standalone challenges',
    description:
      'Retrieves daily standalone challenges (quest one-time challenges are nested under missions/quests).',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all challenges retrieved successfully',
    type: [ChallengeResponseDto],
  })
  @ApiCrudErrorResponses()
  async getAll(
    @Query() query: LangQueryDto,
  ): Promise<ChallengeResponseDto[]> {
    return this.challengeService.getAll(query.lang);
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
    @Query() query: LangQueryDto,
  ): Promise<ChallengeResponseDto> {
    return this.challengeService.getChallengeById(id, query.lang);
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
