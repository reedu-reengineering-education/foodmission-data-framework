import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QuestProgressResponseDto } from '../dto/response-quest-progress.dto';
import { UpdateQuestProgressDto } from '../dto/update-quest-progress.dto';
import { QuestProgressService } from '../services/quest-progress.service';

@ApiTags('quests')
@Controller('quests/:questId/progress')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class QuestProgressController {
  constructor(private readonly questProgressService: QuestProgressService) {}

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get quest progress for the current user' })
  @ApiParam({ name: 'questId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: QuestProgressResponseDto })
  @ApiCrudErrorResponses()
  async getQuestProgress(
    @Param('questId', ParseUUIDPipe) questId: string,
    @CurrentUser('id') userId: string,
  ): Promise<QuestProgressResponseDto> {
    return this.questProgressService.getQuestById(questId, userId);
  }

  @Patch()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update quest progress for the current user' })
  @ApiParam({ name: 'questId', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdateQuestProgressDto })
  @ApiResponse({ status: 200, type: QuestProgressResponseDto })
  @ApiCrudErrorResponses()
  async update(
    @Param('questId', ParseUUIDPipe) questId: string,
    @Body() updateQuestProgressDto: UpdateQuestProgressDto,
    @CurrentUser('id') userId: string,
  ): Promise<QuestProgressResponseDto> {
    return this.questProgressService.update(
      questId,
      updateQuestProgressDto,
      userId,
    );
  }
}
