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
import { PaginatedResponseDto } from '../../common/dto/api-response.dto';
import { LearningService } from '../services/learning.service';
import { LearningLangQueryDto } from '../dto/learning-lang-query.dto';
import { LearningPaginatedQueryDto } from '../dto/learning-list-query.dto';
import { MicroLearningResponseDto } from '../dto/micro-learning-response.dto';

@ApiTags('micro-learnings')
@Controller('micro-learnings')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class MicroLearningsController {
  constructor(private readonly learningService: LearningService) {}

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List available micro-learnings (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated micro-learnings' })
  @ApiCrudErrorResponses()
  async list(
    @Query() query: LearningPaginatedQueryDto,
  ): Promise<PaginatedResponseDto<MicroLearningResponseDto>> {
    return this.learningService.listMicroLearnings(query);
  }

  @Get('by-code/:code')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a micro-learning by code' })
  @ApiParam({
    name: 'code',
    description: 'Micro-learning code (e.g. ML1.1.1)',
    example: 'ML1.1.1',
  })
  @ApiResponse({ status: 200, type: MicroLearningResponseDto })
  @ApiCrudErrorResponses()
  async getByCode(
    @Param('code') code: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<MicroLearningResponseDto> {
    return this.learningService.getMicroLearning(code, query);
  }

  @Get(':codeOrId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a micro-learning by UUID or code' })
  @ApiParam({
    name: 'codeOrId',
    description: 'Micro-learning UUID or code (e.g. ML1.1.1)',
    example: 'ML1.1.1',
  })
  @ApiResponse({ status: 200, type: MicroLearningResponseDto })
  @ApiCrudErrorResponses()
  async getOne(
    @Param('codeOrId') codeOrId: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<MicroLearningResponseDto> {
    return this.learningService.getMicroLearning(codeOrId, query);
  }
}
