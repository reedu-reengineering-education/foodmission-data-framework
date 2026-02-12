import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';

import { Roles } from 'nest-keycloak-connect';
import { CurrentUser } from '../../common/decorators/current-user.decorator';



@ApiTags('missions')
@Controller('missions')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}
  @Post()
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Create a new Mission',
    description:
      'Creates a new mission as an Admin',
  })
  @ApiBody({ type: CreateMissionDto })
  @ApiResponse({
    status: 201,
    description: 'Mission created successfully',
    type: MissionResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'A mission with this title already exist.',
  })
  @ApiCrudErrorResponses()
  async create(
    @Body() createMissionDto: CreateMissionDto,
    @CurrentUser('id') userId: string,
  ): Promise<MissionResponseDto> {
    return this.missionsService.create(createMissionDto, userId);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all user missions',
    description:
      'Retrieves all missions for the authenticated user. Returns an empty array if no missions exist.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of missions retrieved successfully',
    type: [MissionResponseDto],
  })
  @ApiCrudErrorResponses()
  async getAllMissions(
    @CurrentUser('id') userId: string,
  ): Promise<MissionResponseDto[]> {
    return this.missionsService.getAllMissionsByUserId(userId);
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get mission by ID',
    description:
      'Retrieves a specific mission by ID for the authenticated user. Only the mission owner can access it.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Mission retrieved successfully',
    type: MissionResponseDto,
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
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<MissionResponseDto> {
    return this.missionsService.getMissionById(id, userId);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update mission',
    description:
      'Updates the mission progress.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Mission updated successfully',
    type: MissionResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No permission - user does not own this mission',
  })
  @ApiCrudErrorResponses()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMissionDto: UpdateMissionDto,
    @CurrentUser('id') userId: string,
  ): Promise<MissionResponseDto> {
    return this.missionsService.update(id, updateMissionDto, userId);
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
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.missionsService.remove(id, userId);
  }
}
