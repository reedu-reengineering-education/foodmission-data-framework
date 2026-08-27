import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
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
import { ThrottlerGuard } from '@nestjs/throttler';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { ApiCrudErrorResponses } from '../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../../common/dto/api-response.dto';
import { LearningService } from '../services/learning.service';
import { LearningLangQueryDto } from '../dto/learning-lang-query.dto';
import { PaginatedLangQueryDto } from '../dto/paginated-lang-query.dto';
import {
  LearningPaginatedQueryDto,
} from '../dto/learning-list-query.dto';
import { QuizResponseDto } from '../dto/quiz-response.dto';
import {
  QuizProgressResponseDto,
  UpdateQuizProgressDto,
} from '../dto/quiz-progress.dto';

@ApiTags('quizzes')
@Controller('quizzes')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class QuizzesController {
  constructor(private readonly learningService: LearningService) {}

  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List available quizzes (paginated)',
    description: 'Options omit isCorrect for public consumption.',
  })
  @ApiResponse({ status: 200, description: 'Paginated quizzes' })
  @ApiCrudErrorResponses()
  async list(
    @Query() query: LearningPaginatedQueryDto,
  ): Promise<PaginatedResponseDto<QuizResponseDto>> {
    return this.learningService.listQuizzes(query);
  }

  @Get('random')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get a random quiz not yet completed by the current user',
    description:
      'Filters by dimensionCode, topicCode, and/or level. Returns 404 when no unseen quiz matches.',
  })
  @ApiResponse({ status: 200, type: QuizResponseDto })
  @ApiResponse({ status: 404, description: 'No unseen quiz found' })
  @ApiCrudErrorResponses()
  async getRandom(
    @CurrentUser('id') userId: string,
    @Query() query: LearningPaginatedQueryDto,
  ): Promise<QuizResponseDto> {
    const quiz = await this.learningService.getRandomQuiz(
      userId,
      query,
      query.lang,
    );
    if (!quiz) throw new NotFoundException('No unseen quiz found');
    return quiz;
  }

  @Get('progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all quiz progress rows for the current user',
  })
  @ApiResponse({ status: 200, type: [QuizProgressResponseDto] })
  @ApiCrudErrorResponses()
  async listProgress(
    @CurrentUser('id') userId: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<QuizProgressResponseDto[]> {
    return this.learningService.listQuizProgressForUser(userId, query.lang);
  }

  @Get('progress/all')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List all quiz progress rows (paginated)',
    description:
      'Returns paginated quiz progress for all users. Supports lang for translated questions.',
  })
  @ApiResponse({ status: 200, description: 'Paginated quiz progress' })
  @ApiCrudErrorResponses()
  async listAllProgressPaginated(
    @Query() query: PaginatedLangQueryDto,
  ): Promise<PaginatedResponseDto<QuizProgressResponseDto>> {
    return this.learningService.listAllQuizProgressPaginated(query);
  }

  @Get('by-code/:code/progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user quiz progress by code' })
  @ApiParam({
    name: 'code',
    description: 'Quiz code (e.g. Q1.1.1)',
    example: 'Q1.1.1',
  })
  @ApiResponse({ status: 200, type: QuizProgressResponseDto })
  @ApiCrudErrorResponses()
  async getProgressByCode(
    @CurrentUser('id') userId: string,
    @Param('code') code: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<QuizProgressResponseDto> {
    return this.learningService.getQuizProgress(userId, code, query.lang);
  }

  @Patch('by-code/:code/progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Upsert quiz progress by code for current user',
    description:
      'Sets selected option, derives isCorrect from the option, marks completed.',
  })
  @ApiParam({
    name: 'code',
    description: 'Quiz code (e.g. Q1.1.1)',
    example: 'Q1.1.1',
  })
  @ApiBody({ type: UpdateQuizProgressDto })
  @ApiResponse({ status: 200, type: QuizProgressResponseDto })
  @ApiCrudErrorResponses()
  async upsertProgressByCode(
    @CurrentUser('id') userId: string,
    @Param('code') code: string,
    @Body() dto: UpdateQuizProgressDto,
    @Query() query: LearningLangQueryDto,
  ): Promise<QuizProgressResponseDto> {
    return this.learningService.upsertQuizProgress(
      userId,
      code,
      dto,
      query.lang,
    );
  }

  @Get('by-code/:code')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get a quiz by code',
    description: 'Options omit isCorrect.',
  })
  @ApiParam({
    name: 'code',
    description: 'Quiz code (e.g. Q1.1.1)',
    example: 'Q1.1.1',
  })
  @ApiResponse({ status: 200, type: QuizResponseDto })
  @ApiCrudErrorResponses()
  async getByCode(
    @Param('code') code: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<QuizResponseDto> {
    return this.learningService.getQuiz(code, query);
  }

  @Get(':codeOrId/progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user quiz progress' })
  @ApiParam({
    name: 'codeOrId',
    description: 'Quiz UUID or code (e.g. Q1.1.1)',
    example: 'Q1.1.1',
  })
  @ApiResponse({ status: 200, type: QuizProgressResponseDto })
  @ApiCrudErrorResponses()
  async getProgress(
    @CurrentUser('id') userId: string,
    @Param('codeOrId') codeOrId: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<QuizProgressResponseDto> {
    return this.learningService.getQuizProgress(userId, codeOrId, query.lang);
  }

  @Patch(':codeOrId/progress')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Upsert quiz progress for current user',
    description:
      'Sets selected option, derives isCorrect from the option, marks completed.',
  })
  @ApiParam({
    name: 'codeOrId',
    description: 'Quiz UUID or code (e.g. Q1.1.1)',
    example: 'Q1.1.1',
  })
  @ApiBody({ type: UpdateQuizProgressDto })
  @ApiResponse({ status: 200, type: QuizProgressResponseDto })
  @ApiCrudErrorResponses()
  async upsertProgress(
    @CurrentUser('id') userId: string,
    @Param('codeOrId') codeOrId: string,
    @Body() dto: UpdateQuizProgressDto,
    @Query() query: LearningLangQueryDto,
  ): Promise<QuizProgressResponseDto> {
    return this.learningService.upsertQuizProgress(
      userId,
      codeOrId,
      dto,
      query.lang,
    );
  }

  @Get(':codeOrId')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get a quiz by UUID or code',
    description: 'Options omit isCorrect.',
  })
  @ApiParam({
    name: 'codeOrId',
    description: 'Quiz UUID or code (e.g. Q1.1.1)',
    example: 'Q1.1.1',
  })
  @ApiResponse({ status: 200, type: QuizResponseDto })
  @ApiCrudErrorResponses()
  async getOne(
    @Param('codeOrId') codeOrId: string,
    @Query() query: LearningLangQueryDto,
  ): Promise<QuizResponseDto> {
    return this.learningService.getQuiz(codeOrId, query);
  }
}
