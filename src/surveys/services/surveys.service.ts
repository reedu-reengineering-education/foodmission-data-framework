import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { SurveysRepository } from '../repositories/surveys.repository';
import { CreateSurveyDto, UpdateSurveyDto, SubmitSurveyResponseDto, SurveyDto, SurveyResponseDto } from '../dto/survey.dto';

@Injectable()
export class SurveysService {
  constructor(private readonly surveysRepository: SurveysRepository) {}

  private mapSurveyToDto(survey: any): SurveyDto {
    return survey as SurveyDto;
  }

  private mapSurveyResponseToDto(response: any): SurveyResponseDto {
    return {
      ...response,
      responses: response.questionResponses,
    } as SurveyResponseDto;
  }

  // Survey Operations
  async getAllSurveys(): Promise<SurveyDto[]> {
    const surveys = await this.surveysRepository.getAllSurveys();
    return surveys.map((s) => this.mapSurveyToDto(s));
  }

  async getSurveyById(id: string): Promise<SurveyDto> {
    const survey = await this.surveysRepository.getSurveyById(id);
    if (!survey) {
      throw new NotFoundException(`Survey with id ${id} not found`);
    }
    return this.mapSurveyToDto(survey);
  }

  async createSurvey(data: CreateSurveyDto): Promise<SurveyDto> {
    if (!data.title || data.title.trim().length === 0) {
      throw new BadRequestException('Survey title is required and cannot be empty');
    }

    if (!data.questions || data.questions.length === 0) {
      throw new BadRequestException('Survey must have at least one question');
    }

    for (const question of data.questions) {
      if (!question.text || question.text.trim().length === 0) {
        throw new BadRequestException('Question text cannot be empty');
      }
      if (!question.answerOptions || question.answerOptions.length === 0) {
        throw new BadRequestException('Each question must have at least one answer option');
      }
    }

    const survey = await this.surveysRepository.createSurvey(data);
    return this.mapSurveyToDto(survey);
  }

  async updateSurvey(id: string, data: UpdateSurveyDto): Promise<SurveyDto> {
    const survey = await this.surveysRepository.getSurveyById(id);
    if (!survey) {
      throw new NotFoundException(`Survey with id ${id} not found`);
    }
    const updated = await this.surveysRepository.updateSurvey(id, data);
    return this.mapSurveyToDto(updated);
  }

  async deleteSurvey(id: string): Promise<void> {
    const survey = await this.surveysRepository.getSurveyById(id);
    if (!survey) {
      throw new NotFoundException(`Survey with id ${id} not found`);
    }
    await this.surveysRepository.deleteSurvey(id);
  }

  // Question Operations
  async addQuestion(surveyId: string, questionData: { text: string; type: string; answerOptions: Array<{ text: string }> }) {
    const survey = await this.surveysRepository.getSurveyById(surveyId);
    if (!survey) {
      throw new NotFoundException(`Survey with id ${surveyId} not found`);
    }

    if (!questionData.text || questionData.text.trim().length === 0) {
      throw new BadRequestException('Question text is required');
    }

    if (!questionData.answerOptions || questionData.answerOptions.length === 0) {
      throw new BadRequestException('Question must have at least one answer option');
    }

    return this.surveysRepository.createQuestion(surveyId, questionData.text, questionData.type, questionData.answerOptions);
  }

  async updateQuestion(questionId: string, text: string, type: string) {
    return this.surveysRepository.updateQuestion(questionId, text, type);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    await this.surveysRepository.deleteQuestion(questionId);
  }

  // Survey Response Operations
  async submitSurveyResponse(userId: string, surveyId: string, data: SubmitSurveyResponseDto): Promise<SurveyResponseDto> {
    // Validate survey exists
    const survey = await this.surveysRepository.getSurveyById(surveyId);
    if (!survey) {
      throw new NotFoundException(`Survey with id ${surveyId} not found`);
    }

    // Check if user already responded to this survey
    const existingResponse = await this.surveysRepository.getSurveyResponse(userId, surveyId);
    if (existingResponse) {
      throw new ConflictException(`User has already responded to survey ${surveyId}`);
    }

    // Validate all questions belong to the survey
    const questionIds = new Set(survey.questions.map((q) => q.id));
    for (const response of data.responses) {
      if (!questionIds.has(response.questionId)) {
        throw new BadRequestException(`Question ${response.questionId} does not belong to survey ${surveyId}`);
      }
    }

    // Validate all answer options belong to their respective questions
    const questionAnswerMap = new Map<string, Set<string>>(
      survey.questions.map((q) => [q.id, new Set(q.answerOptions.map((a) => a.id))]),
    );

    for (const response of data.responses) {
      const validAnswerIds = questionAnswerMap.get(response.questionId);
      if (!validAnswerIds || !validAnswerIds.has(response.selectedAnswerId)) {
        throw new BadRequestException(`Answer option ${response.selectedAnswerId} is not valid for question ${response.questionId}`);
      }
    }

    // Prepare data for repository
    const submitData: SubmitSurveyResponseDto = {
      responses: data.responses,
    };

    const result = await this.surveysRepository.submitSurveyResponse(userId, surveyId, submitData);
    return this.mapSurveyResponseToDto(result);
  }

  async getUserSurveyResponse(userId: string, surveyId: string): Promise<SurveyResponseDto> {
    const response = await this.surveysRepository.getSurveyResponse(userId, surveyId);
    if (!response) {
      throw new NotFoundException(`No response found for user ${userId} on survey ${surveyId}`);
    }
    return this.mapSurveyResponseToDto(response);
  }

  async getUserSurveyResponses(userId: string) {
    const responses = await this.surveysRepository.getUserSurveyResponses(userId);
    return responses.map((r) => this.mapSurveyResponseToDto(r));
  }
}
