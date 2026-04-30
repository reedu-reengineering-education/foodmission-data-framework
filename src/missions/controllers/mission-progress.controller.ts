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
import { MissionProgressService } from '../services/mission-progress.service';
import { UpdateMissionProgressDto } from '../dto/update-mission-progress.dto';
import { MissionProgressResponseDto } from '../dto/response-mission-progress.dto';

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
  ): Promise<MissionProgressResponseDto> {
    return this.missionProgressService.getMissionById(missionId, userId);
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
  ): Promise<MissionProgressResponseDto> {
    return this.missionProgressService.update(
      missionId,
      updateMissionProgressDto,
      userId,
    );
  }
}
