import {
  Body,
  Controller,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { Roles } from 'nest-keycloak-connect';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MissionProgressService } from '../services/mission-progress.service';
import { UpdateMissionProgressDto } from '../dto/update-mission-progress.dto';
import { StartMissionProgressDto } from '../dto/start-mission-progress.dto';
import { MissionProgressResponseDto } from '../dto/response-mission-progress.dto';
import { LearningLangQueryDto } from '../../learning/dto/learning-lang-query.dto';

@ApiTags('missions')
@Controller('missions/:missionId/progress')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class MissionProgressController {
  constructor(
    private readonly missionProgressService: MissionProgressService,
  ) {}

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get mission progress by mission ID',
    description:
      'Retrieves the progress of a specific mission for the authenticated user.',
  })
  @ApiParam({ name: 'missionId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Mission progress retrieved successfully',
    type: MissionProgressResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No permission',
  })
  @ApiResponse({
    status: 404,
    description: 'Mission progress not found',
  })
  @ApiCrudErrorResponses()
  async getMissionById(
    @Param('missionId', ParseUUIDPipe) missionId: string,
    @CurrentUser('id') userId: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<MissionProgressResponseDto> {
    return this.missionProgressService.getMissionById(
      missionId,
      userId,
      query.lang,
    );
  }

  @Patch()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update mission progress',
    description:
      'Updates the progress or completion status of a specific mission for the authenticated user.',
  })
  @ApiParam({ name: 'missionId', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdateMissionProgressDto })
  @ApiResponse({
    status: 200,
    description: 'Mission progress updated successfully',
    type: MissionProgressResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No permission - user does not own this mission progress',
  })
  @ApiResponse({
    status: 404,
    description: 'Mission progress not found',
  })
  @ApiCrudErrorResponses()
  async update(
    @Param('missionId', ParseUUIDPipe) missionId: string,
    @Body() updateMissionProgressDto: UpdateMissionProgressDto,
    @CurrentUser('id') userId: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<MissionProgressResponseDto> {
    return this.missionProgressService.update(
      missionId,
      updateMissionProgressDto,
      userId,
      query.lang,
    );
  }

  @Post('start')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Start a mission',
    description:
      'Starts a mission of the current quest: creates its progress at 0 with ' +
      'a start time, so its rule window runs from now. Selecting a quest ' +
      'does not start its missions, and only started missions get progress. ' +
      'Starting an already started mission returns it unchanged. Missions ' +
      'whose rule asks for numbers take them as `inputs` (e.g. M.B1.3: ' +
      '{"inputs": {"previousMeatMeals": 5}}); others take no body. Returns ' +
      '400 when the mission is not part of the current quest or the inputs ' +
      'are invalid.',
  })
  @ApiParam({ name: 'missionId', type: 'string', format: 'uuid' })
  @ApiBody({ type: StartMissionProgressDto, required: false })
  @ApiResponse({
    status: 201,
    description: 'Mission started (or already started)',
    type: MissionProgressResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'The mission is not part of the current quest, or the inputs are invalid',
  })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  @ApiCrudErrorResponses()
  async start(
    @Param('missionId', ParseUUIDPipe) missionId: string,
    @CurrentUser('id') userId: string,
    @Query() query: LearningLangQueryDto,
    @Body() body: StartMissionProgressDto = {},
  ): Promise<MissionProgressResponseDto> {
    return this.missionProgressService.start(
      missionId,
      userId,
      query.lang,
      body.inputs,
    );
  }

  @Post('restart')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Restart a failed mission',
    description:
      'Starts a FAILED mission again as a new attempt: progress 0, status ' +
      'NOT_STARTED and a new start time, so its rule window starts over. ' +
      'Takes the same optional `inputs` as start, for the new attempt. ' +
      'Returns 400 when the mission has not failed or the inputs are invalid.',
  })
  @ApiParam({ name: 'missionId', type: 'string', format: 'uuid' })
  @ApiBody({ type: StartMissionProgressDto, required: false })
  @ApiResponse({
    status: 201,
    description: 'Mission restarted',
    type: MissionProgressResponseDto,
  })
  @ApiResponse({ status: 400, description: 'The mission has not failed' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  @ApiCrudErrorResponses()
  async restart(
    @Param('missionId', ParseUUIDPipe) missionId: string,
    @CurrentUser('id') userId: string,
    @Query() query: LearningLangQueryDto,
    @Body() body: StartMissionProgressDto = {},
  ): Promise<MissionProgressResponseDto> {
    return this.missionProgressService.restart(
      missionId,
      userId,
      query.lang,
      body.inputs,
    );
  }
}
