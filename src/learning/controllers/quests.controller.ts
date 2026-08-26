import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LearningService } from '../services/learning.service';
import { LearningLangQueryDto } from '../dto/learning-lang-query.dto';
import { PaginatedLangQueryDto } from '../dto/paginated-lang-query.dto';
import { LearningQuestListQueryDto } from '../dto/learning-list-query.dto';
import { CreateQuestDto } from '../dto/create-quest.dto';
import { PaginatedResponseDto } from '../../common/dto/api-response.dto';
import { QuestResponseDto } from '../dto/quest-response.dto';
import {
  QuestProgressResponseDto,
  UpdateQuestProgressDto,
} from '../dto/quest-progress.dto';

@ApiTags('quests')
@Controller('quests')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class QuestsController {
  constructor(private readonly learningService: LearningService) {}

  @Post()
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a quest',
    description:
      'Creates a quest with nested items. Item contentCode values must exist for the given contentType. Unique on code.',
  })
  @ApiBody({ type: CreateQuestDto })
  @ApiResponse({
    status: 201,
    description: 'Quest created successfully',
    type: QuestResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Quest code already exists',
  })
  @ApiCrudErrorResponses()
  async create(@Body() dto: CreateQuestDto): Promise<QuestResponseDto> {
    return this.learningService.createQuest(dto);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List available quests' })
  @ApiResponse({ status: 200, type: [QuestResponseDto] })
  @ApiCrudErrorResponses()
  async list(
    @Query() query: LearningQuestListQueryDto,
  ): Promise<QuestResponseDto[]> {
    return this.learningService.listQuests(query);
  }

  @Get('progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all quest progress rows for the current user',
  })
  @ApiResponse({ status: 200, type: [QuestProgressResponseDto] })
  @ApiCrudErrorResponses()
  async listProgress(
    @CurrentUser('id') userId: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<QuestProgressResponseDto[]> {
    return this.learningService.listQuestProgressForUser(userId, query.lang);
  }

  @Get('progress/all')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List all quest progress rows (paginated)',
    description:
      'Returns paginated quest progress for all users. Supports lang for translated quest titles.',
  })
  @ApiResponse({ status: 200, description: 'Paginated quest progress' })
  @ApiCrudErrorResponses()
  async listAllProgressPaginated(
    @Query() query: PaginatedLangQueryDto,
  ): Promise<PaginatedResponseDto<QuestProgressResponseDto>> {
    return this.learningService.listAllQuestProgressPaginated(query);
  }

  @Get('by-code/:code/progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user quest progress by code' })
  @ApiParam({
    name: 'code',
    description: 'Quest code (e.g. QUEST.DIET_CHANGES.BEGINNER.1)',
    example: 'QUEST.DIET_CHANGES.BEGINNER.1',
  })
  @ApiResponse({ status: 200, type: QuestProgressResponseDto })
  @ApiCrudErrorResponses()
  async getProgressByCode(
    @CurrentUser('id') userId: string,
    @Param('code') code: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<QuestProgressResponseDto> {
    return this.learningService.getQuestProgress(userId, code, query.lang);
  }

  @Patch('by-code/:code/progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upsert quest progress by code for current user' })
  @ApiParam({
    name: 'code',
    description: 'Quest code (e.g. QUEST.DIET_CHANGES.BEGINNER.1)',
    example: 'QUEST.DIET_CHANGES.BEGINNER.1',
  })
  @ApiBody({ type: UpdateQuestProgressDto })
  @ApiResponse({ status: 200, type: QuestProgressResponseDto })
  @ApiCrudErrorResponses()
  async upsertProgressByCode(
    @CurrentUser('id') userId: string,
    @Param('code') code: string,
    @Body() dto: UpdateQuestProgressDto,
    @Query() query: LearningLangQueryDto,
  ): Promise<QuestProgressResponseDto> {
    return this.learningService.upsertQuestProgress(
      userId,
      code,
      dto,
      query.lang,
    );
  }

  @Get('by-code/:code')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get a quest by code',
    description:
      'Includes ordered quest items with translated labels when lang is set.',
  })
  @ApiParam({
    name: 'code',
    description: 'Quest code (e.g. QUEST.DIET_CHANGES.BEGINNER.1)',
    example: 'QUEST.DIET_CHANGES.BEGINNER.1',
  })
  @ApiResponse({ status: 200, type: QuestResponseDto })
  @ApiCrudErrorResponses()
  async getByCode(
    @Param('code') code: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<QuestResponseDto> {
    return this.learningService.getQuest(code, query);
  }

  @Get(':codeOrId/progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user quest progress' })
  @ApiParam({
    name: 'codeOrId',
    description: 'Quest UUID or code (e.g. QUEST.DIET_CHANGES.BEGINNER.1)',
    example: 'QUEST.DIET_CHANGES.BEGINNER.1',
  })
  @ApiResponse({ status: 200, type: QuestProgressResponseDto })
  @ApiCrudErrorResponses()
  async getProgress(
    @CurrentUser('id') userId: string,
    @Param('codeOrId') codeOrId: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<QuestProgressResponseDto> {
    return this.learningService.getQuestProgress(userId, codeOrId, query.lang);
  }

  @Patch(':codeOrId/progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upsert quest progress for current user' })
  @ApiParam({
    name: 'codeOrId',
    description: 'Quest UUID or code (e.g. QUEST.DIET_CHANGES.BEGINNER.1)',
    example: 'QUEST.DIET_CHANGES.BEGINNER.1',
  })
  @ApiBody({ type: UpdateQuestProgressDto })
  @ApiResponse({ status: 200, type: QuestProgressResponseDto })
  @ApiCrudErrorResponses()
  async upsertProgress(
    @CurrentUser('id') userId: string,
    @Param('codeOrId') codeOrId: string,
    @Body() dto: UpdateQuestProgressDto,
    @Query() query: LearningLangQueryDto,
  ): Promise<QuestProgressResponseDto> {
    return this.learningService.upsertQuestProgress(
      userId,
      codeOrId,
      dto,
      query.lang,
    );
  }

  @Get(':codeOrId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get a quest by UUID or code',
    description:
      'Includes ordered quest items with translated labels when lang is set.',
  })
  @ApiParam({
    name: 'codeOrId',
    description: 'Quest UUID or code (e.g. QUEST.DIET_CHANGES.BEGINNER.1)',
    example: 'QUEST.DIET_CHANGES.BEGINNER.1',
  })
  @ApiResponse({ status: 200, type: QuestResponseDto })
  @ApiCrudErrorResponses()
  async getOne(
    @Param('codeOrId') codeOrId: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<QuestResponseDto> {
    return this.learningService.getQuest(codeOrId, query);
  }
}
