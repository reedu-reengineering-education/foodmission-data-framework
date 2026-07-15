import {
  Body,
  Controller,
  Delete,
  Get,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import { LangQueryDto } from '../../i18n/dto/lang-query.dto';
import { CreateQuestDto } from '../dto/create-quest.dto';
import { QueryQuestsDto } from '../dto/query-quests.dto';
import { QuestProgressResponseDto } from '../dto/response-quest-progress.dto';
import { QuestResponseDto } from '../dto/response-quest.dto';
import { UpdateQuestDto } from '../dto/update-quest.dto';
import { QuestProgressService } from '../services/quest-progress.service';
import { QuestsService } from '../services/quests.service';

@ApiTags('quests')
@Controller('quests')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
@ApiQuery({
  name: 'lang',
  required: false,
  type: String,
  enum: SUPPORTED_LOCALES,
  description: `Optional locale override for translated quest copy. Defaults to ${DEFAULT_LOCALE}.`,
})
export class QuestsController {
  constructor(
    private readonly questsService: QuestsService,
    private readonly questProgressService: QuestProgressService,
  ) {}

  @Post()
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new quest',
    description: 'Creates a quest under a mission. Copy lives in gamification.json.',
  })
  @ApiBody({ type: CreateQuestDto })
  @ApiResponse({
    status: 201,
    description: 'Quest created successfully',
    type: QuestResponseDto,
  })
  @ApiCrudErrorResponses()
  async create(@Body() createQuestDto: CreateQuestDto): Promise<QuestResponseDto> {
    return this.questsService.create(createQuestDto);
  }

  @Get('progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all quest progress for the current user',
  })
  @ApiResponse({
    status: 200,
    type: [QuestProgressResponseDto],
  })
  @ApiCrudErrorResponses()
  async getAllProgress(
    @CurrentUser('id') userId: string,
    @Query() query: LangQueryDto,
  ): Promise<QuestProgressResponseDto[]> {
    return this.questProgressService.getAllQuestsByUserId(userId, query.lang);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List quests',
    description: 'Returns quests, optionally filtered by missionId.',
  })
  @ApiResponse({
    status: 200,
    type: [QuestResponseDto],
  })
  @ApiCrudErrorResponses()
  async getQuests(@Query() query: QueryQuestsDto): Promise<QuestResponseDto[]> {
    return this.questsService.getQuests(query.missionId, query.lang);
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get quest by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: QuestResponseDto })
  @ApiResponse({ status: 404, description: 'Quest not found' })
  @ApiCrudErrorResponses()
  async getQuestById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: LangQueryDto,
  ): Promise<QuestResponseDto> {
    return this.questsService.getQuestById(id, query.lang);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update quest metadata' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: QuestResponseDto })
  @ApiCrudErrorResponses()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuestDto: UpdateQuestDto,
  ): Promise<QuestResponseDto> {
    return this.questsService.update(id, updateQuestDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete quest' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Quest deleted successfully' })
  @ApiCrudErrorResponses()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.questsService.remove(id);
  }
}
