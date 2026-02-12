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
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { KnowledgeService } from '../services/knowledge.service';
import { KnowledgeProgressService } from '../services/knowledge-progress.service';
import { CreateKnowledgeDto } from '../dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from '../dto/update-knowledge.dto';
import {
  MultipleKnowledgeResponseDto,
  KnowledgeResponseDto,
} from '../dto/knowledge-response.dto';
import { QueryKnowledgeDto } from '../dto/query-knowledge.dto';
import {
  UpdateProgressDto,
  ProgressResponseDto,
} from '../dto/update-progress.dto';

@ApiTags('knowledge')
@Controller('knowledge')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly progressService: KnowledgeProgressService,
  ) {}

  @Post()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a knowledge/quiz item' })
  @ApiBody({ type: CreateKnowledgeDto })
  @ApiResponse({
    status: 201,
    description: 'Knowledge created successfully',
    type: KnowledgeResponseDto,
  })
  @ApiCrudErrorResponses()
  create(
    @Body() createKnowledgeDto: CreateKnowledgeDto,
    @CurrentUser('id') userId: string,
  ): Promise<KnowledgeResponseDto> {
    return this.knowledgeService.create(createKnowledgeDto, userId);
  }

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List knowledge items' })
  @ApiQuery({ name: 'available', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    description: 'Knowledge items retrieved successfully',
    type: MultipleKnowledgeResponseDto,
  })
  @ApiCrudErrorResponses()
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryKnowledgeDto,
  ): Promise<MultipleKnowledgeResponseDto> {
    return this.knowledgeService.findAll(userId, query);
  }

  @Get('progress/all')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all progress for the current user' })
  @ApiResponse({
    status: 200,
    description: 'All progress retrieved successfully',
    type: [ProgressResponseDto],
  })
  @ApiCrudErrorResponses()
  getAllProgress(
    @CurrentUser('id') userId: string,
  ): Promise<ProgressResponseDto[]> {
    return this.progressService.getAllUserProgress(userId);
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get knowledge item by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Knowledge retrieved successfully',
    type: KnowledgeResponseDto,
  })
  @ApiCrudErrorResponses()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<KnowledgeResponseDto> {
    return this.knowledgeService.findOne(id, userId);
  }

  @Patch(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update knowledge item' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Knowledge updated successfully',
    type: KnowledgeResponseDto,
  })
  @ApiCrudErrorResponses()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateKnowledgeDto: UpdateKnowledgeDto,
    @CurrentUser('id') userId: string,
  ): Promise<KnowledgeResponseDto> {
    return this.knowledgeService.update(id, updateKnowledgeDto, userId);
  }

  @Delete(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete knowledge item' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Knowledge deleted successfully' })
  @ApiCrudErrorResponses()
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.knowledgeService.remove(id, userId);
  }

  // Progress endpoints
  @Get(':id/progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user progress for a knowledge item' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Knowledge ID' })
  @ApiResponse({
    status: 200,
    description: 'Progress retrieved successfully',
    type: ProgressResponseDto,
  })
  @ApiCrudErrorResponses()
  getProgress(
    @Param('id', ParseUUIDPipe) knowledgeId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ProgressResponseDto | null> {
    return this.progressService.getProgress(userId, knowledgeId);
  }

  @Post(':id/progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Update user progress for a knowledge item' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Knowledge ID' })
  @ApiBody({ type: UpdateProgressDto })
  @ApiResponse({
    status: 200,
    description: 'Progress updated successfully',
    type: ProgressResponseDto,
  })
  @ApiCrudErrorResponses()
  updateProgress(
    @Param('id', ParseUUIDPipe) knowledgeId: string,
    @Body() updateProgressDto: UpdateProgressDto,
    @CurrentUser('id') userId: string,
  ): Promise<ProgressResponseDto> {
    return this.progressService.updateProgress(
      userId,
      knowledgeId,
      updateProgressDto,
    );
  }

  @Delete(':id/progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete user progress for a knowledge item' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Knowledge ID' })
  @ApiResponse({ status: 200, description: 'Progress deleted successfully' })
  @ApiCrudErrorResponses()
  deleteProgress(
    @Param('id', ParseUUIDPipe) knowledgeId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.progressService.deleteProgress(userId, knowledgeId);
  }
}
