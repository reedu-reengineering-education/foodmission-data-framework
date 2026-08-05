import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
    summary: 'List all quest progress rows (admin, paginated)',
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

  @Get(':codeOrId/progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user quest progress' })
  @ApiParam({ name: 'codeOrId', description: 'Quest UUID or code' })
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
  @ApiParam({ name: 'codeOrId', description: 'Quest UUID or code' })
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
  @ApiParam({ name: 'codeOrId', description: 'Quest UUID or code' })
  @ApiResponse({ status: 200, type: QuestResponseDto })
  @ApiCrudErrorResponses()
  async getOne(
    @Param('codeOrId') codeOrId: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<QuestResponseDto> {
    return this.learningService.getQuest(codeOrId, query);
  }
}
