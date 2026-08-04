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
import { DimensionResponseDto } from '../dto/dimension-response.dto';

@ApiTags('dimensions')
@Controller('dimensions')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class DimensionsController {
  constructor(private readonly learningService: LearningService) {}

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List dimensions with nested topics' })
  @ApiResponse({ status: 200, type: [DimensionResponseDto] })
  @ApiCrudErrorResponses()
  async list(
    @Query() query: LearningLangQueryDto,
  ): Promise<DimensionResponseDto[]> {
    return this.learningService.listDimensions(query);
  }

  @Get(':codeOrId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a dimension by UUID or code' })
  @ApiParam({ name: 'codeOrId', description: 'Dimension UUID or code' })
  @ApiResponse({ status: 200, type: DimensionResponseDto })
  @ApiCrudErrorResponses()
  async getOne(
    @Param('codeOrId') codeOrId: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<DimensionResponseDto> {
    return this.learningService.getDimension(codeOrId, query);
  }
}
