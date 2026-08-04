import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { LearningService } from '../services/learning.service';
import { LearningLangQueryDto } from '../dto/learning-lang-query.dto';
import { LearningQuestListQueryDto } from '../dto/learning-list-query.dto';
import { QuestResponseDto } from '../dto/quest-response.dto';

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

  @Get(':codeOrId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get a quest by UUID or code',
    description: 'Includes ordered quest items (contentType, contentCode).',
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
