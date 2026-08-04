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
import { MissionsResponseDto } from '../dto/response-missions.dto';
import { MissionsService } from '../services/missions.service';
import { CreateMissionsDto } from '../dto/create-missions.dto';
import { UpdateMissionsDto } from '../dto/update-missions.dto';
import { ListMissionsQueryDto } from '../dto/list-missions-query.dto';
import { Roles } from 'nest-keycloak-connect';
import { MissionProgressResponseDto } from '../dto/response-mission-progress.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MissionProgressService } from '../services/mission-progress.service';
import { LearningLangQueryDto } from '../../learning/dto/learning-lang-query.dto';

@ApiTags('missions')
@Controller('missions')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class MissionsController {
  constructor(
    private readonly missionService: MissionsService,
    private readonly missionProgressService: MissionProgressService,
  ) {}

  @Post()
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new Mission',
    description: 'Creates a new mission as an Admin',
  })
  @ApiBody({ type: CreateMissionsDto })
  @ApiResponse({
    status: 201,
    description: 'Mission created successfully',
    type: MissionsResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'A mission with this title already exist.',
  })
  @ApiCrudErrorResponses()
  async create(
    @Body() createMissionDto: CreateMissionsDto,
  ): Promise<MissionsResponseDto> {
    return this.missionService.create(createMissionDto);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all missions',
    description:
      'Retrieves missions filtered by dimension/level/availability. Non-admins only see available missions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Missions retrieved successfully',
    type: [MissionsResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'No permission',
  })
  @ApiResponse({
    status: 404,
    description: 'No missions found',
  })
  @ApiCrudErrorResponses()
  async getAllMissions(
    @Query() query: ListMissionsQueryDto,
    @Req() req: { user?: { roles?: string[] } },
  ): Promise<MissionsResponseDto[]> {
    const isAdmin = Array.isArray(req.user?.roles)
      ? req.user.roles.includes('admin')
      : false;
    return this.missionService.getAllMissions(query, isAdmin);
  }

  @Get('progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all mission progresses for the current user',
    description: 'Retrieves all mission progresses for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of mission progresses retrieved successfully',
    type: [MissionProgressResponseDto],
  })
  @ApiCrudErrorResponses()
  async getAll(
    @CurrentUser('id') userId: string,
  ): Promise<MissionProgressResponseDto[]> {
    return this.missionProgressService.getAllMissionsByUserId(userId);
  }

  @Get(':codeOrId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get mission by UUID or code',
    description: 'Retrieves a specific mission by ID or business code.',
  })
  @ApiParam({ name: 'codeOrId', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Mission retrieved successfully',
    type: MissionsResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No permission',
  })
  @ApiResponse({
    status: 404,
    description: 'Mission not found',
  })
  @ApiCrudErrorResponses()
  async getMissionById(
    @Param('codeOrId') codeOrId: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<MissionsResponseDto> {
    return this.missionService.getMissionById(codeOrId, query.lang);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update mission',
    description: 'Updates the mission progress.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Mission updated successfully',
    type: MissionsResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No permission - user does not own this mission',
  })
  @ApiCrudErrorResponses()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMissionDto: UpdateMissionsDto,
  ): Promise<MissionsResponseDto> {
    return this.missionService.update(id, updateMissionDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete mission',
    description:
      'Deletes a specific mission by ID. Only the admin can delete missions. All related data will be deleted as well (cascade delete).',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Mission deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'No permission - user does not own this mission',
  })
  @ApiResponse({
    status: 404,
    description: 'Mission not found',
  })
  @ApiCrudErrorResponses()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.missionService.remove(id);
  }
}
