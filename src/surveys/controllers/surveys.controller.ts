import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { SurveysService } from '../services/surveys.service';
import {
  CreateSurveyDto,
  UpdateSurveyDto,
  SubmitSurveyResponseDto,
  SurveyDto,
  SurveyResponseDto,
} from '../dto/survey.dto';
import { SurveyQueryDto } from '../dto/survey-query.dto';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { Roles } from 'nest-keycloak-connect';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Surveys')
@Controller('surveys')
@UseGuards(ThrottlerGuard, DataBaseAuthGuard)
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  // User Endpoints - Get Surveys
  @Get()
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all surveys',
    description:
      'Retrieve all available surveys with their questions and answer options. Requires authentication.',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: SUPPORTED_LOCALES,
    description: `Optional locale for translated titles, descriptions and question texts. Defaults to ${DEFAULT_LOCALE}.`,
  })
  @ApiResponse({
    status: 200,
    description: 'List of all surveys successfully retrieved',
    type: [SurveyDto],
  })
  async getAllSurveys(@Query() query: SurveyQueryDto): Promise<SurveyDto[]> {
    return this.surveysService.getAllSurveys(query.lang);
  }

  @Get(':id')
  @Roles('user', 'admin')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'Survey ID' })
  @ApiOperation({
    summary: 'Get survey by ID',
    description:
      'Retrieve a specific survey by its ID, including all questions and answer options. Requires authentication.',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: SUPPORTED_LOCALES,
    description: `Optional locale for translated titles, descriptions and question texts. Defaults to ${DEFAULT_LOCALE}.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Survey retrieved successfully',
    type: SurveyDto,
  })
  @ApiNotFoundResponse({ description: 'Survey not found' })
  async getSurveyById(
    @Param('id') id: string,
    @Query() query: SurveyQueryDto,
  ): Promise<SurveyDto> {
    return this.surveysService.getSurveyById(id, query.lang);
  }

  // User Endpoints - Survey Responses
  @Post(':id/responses')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: 'id', description: 'Survey ID' })
  @ApiOperation({
    summary: 'Submit survey responses',
    description:
      'Submit user responses to a survey. Each response must contain a valid question ID and a Likert value (1-5). A user can only submit one response per survey.',
  })
  @ApiBody({ type: SubmitSurveyResponseDto })
  @ApiResponse({
    status: 201,
    description: 'Survey responses submitted successfully',
    type: SurveyResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid request - missing questions, invalid question ID, out-of-range value, or validation errors',
  })
  @ApiNotFoundResponse({ description: 'Survey not found' })
  @ApiConflictResponse({
    description: 'User has already submitted responses for this survey',
  })
  async submitSurveyResponse(
    @Param('id') surveyId: string,
    @Body() dto: SubmitSurveyResponseDto,
    @CurrentUser() user: any,
  ): Promise<SurveyResponseDto> {
    const userId = user.sub; // Extract userId from JWT
    return this.surveysService.submitSurveyResponse(userId, surveyId, {
      responses: dto.responses,
    });
  }

  @Get(':id/responses/me')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'Survey ID' })
  @ApiOperation({
    summary: "Get user's survey response",
    description:
      "Retrieve the current user's responses to a specific survey if they have responded.",
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: SUPPORTED_LOCALES,
    description: `Optional locale for translated question texts. Defaults to ${DEFAULT_LOCALE}.`,
  })
  @ApiResponse({
    status: 200,
    description: 'User survey response retrieved successfully',
    type: SurveyResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No response found for this user and survey',
  })
  async getUserSurveyResponse(
    @Param('id') surveyId: string,
    @CurrentUser() user: any,
    @Query() query: SurveyQueryDto,
  ): Promise<SurveyResponseDto> {
    const userId = user.sub;
    return this.surveysService.getUserSurveyResponse(
      userId,
      surveyId,
      query.lang,
    );
  }

  @Get('responses/user/all')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: "Get all user's survey responses",
    description: 'Retrieve all survey responses submitted by the current user.',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: SUPPORTED_LOCALES,
    description: `Optional locale for translated titles, descriptions and question texts. Defaults to ${DEFAULT_LOCALE}.`,
  })
  @ApiResponse({
    status: 200,
    description: 'All user survey responses retrieved successfully',
    type: [SurveyResponseDto],
  })
  async getUserSurveyResponses(
    @CurrentUser() user: any,
    @Query() query: SurveyQueryDto,
  ) {
    const userId = user.sub;
    return this.surveysService.getUserSurveyResponses(userId, query.lang);
  }

  // Admin Endpoints - Survey CRUD
  @Post()
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create survey (admin only)',
    description:
      'Create a new survey with questions and answer options. Requires admin role.',
  })
  @ApiBody({ type: CreateSurveyDto })
  @ApiResponse({
    status: 201,
    description: 'Survey created successfully',
    type: SurveyDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid request - missing title, questions, or answer options',
  })
  async createSurvey(@Body() dto: CreateSurveyDto): Promise<SurveyDto> {
    return this.surveysService.createSurvey(dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'Survey ID' })
  @ApiOperation({
    summary: 'Update survey (admin only)',
    description: 'Update survey title or description. Requires admin role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Survey updated successfully',
    type: SurveyDto,
  })
  @ApiNotFoundResponse({ description: 'Survey not found' })
  async updateSurvey(
    @Param('id') id: string,
    @Body() dto: UpdateSurveyDto,
  ): Promise<SurveyDto> {
    return this.surveysService.updateSurvey(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'Survey ID' })
  @ApiOperation({
    summary: 'Delete survey (admin only)',
    description:
      'Delete a survey and all its associated data. Requires admin role.',
  })
  @ApiResponse({ status: 204, description: 'Survey deleted successfully' })
  @ApiNotFoundResponse({ description: 'Survey not found' })
  async deleteSurvey(@Param('id') id: string): Promise<void> {
    return this.surveysService.deleteSurvey(id);
  }

  // Admin Endpoints - Question Management
  @Post(':surveyId/questions')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: 'surveyId', description: 'Survey ID' })
  @ApiOperation({
    summary: 'Add question to survey (admin only)',
    description:
      'Add a new question to an existing survey. Requires admin role.',
  })
  @ApiResponse({ status: 201, description: 'Question added successfully' })
  @ApiNotFoundResponse({ description: 'Survey not found' })
  @ApiBadRequestResponse({ description: 'Invalid question data' })
  async addQuestion(
    @Param('surveyId') surveyId: string,
    @Body()
    dto: { text: string; type: string },
  ) {
    return this.surveysService.addQuestion(surveyId, dto);
  }

  @Patch(':surveyId/questions/:questionId')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'surveyId', description: 'Survey ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiOperation({
    summary: 'Update question (admin only)',
    description: 'Update question text or type. Requires admin role.',
  })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  async updateQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: { text: string; type: string },
  ) {
    return this.surveysService.updateQuestion(questionId, dto.text, dto.type);
  }

  @Delete(':surveyId/questions/:questionId')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'surveyId', description: 'Survey ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiOperation({
    summary: 'Delete question (admin only)',
    description: 'Delete a question from a survey. Requires admin role.',
  })
  @ApiResponse({ status: 204, description: 'Question deleted successfully' })
  async deleteQuestion(@Param('questionId') questionId: string): Promise<void> {
    await this.surveysService.deleteQuestion(questionId);
  }
}
