import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateSurveyDto,
  UpdateSurveyDto,
  SubmitSurveyResponseDto,
} from '../dto/survey.dto';

@Injectable()
export class SurveysRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Survey Operations
  async getAllSurveys() {
    return this.prisma.survey.findMany({
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSurveyById(id: string) {
    return this.prisma.survey.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async createSurvey(data: CreateSurveyDto) {
    const { questions, ...surveyData } = data;

    return this.prisma.survey.create({
      data: {
        ...surveyData,
        questions: {
          create: questions.map((question, qIndex) => ({
            text: question.text,
            type: question.type,
            order: qIndex,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async updateSurvey(id: string, data: UpdateSurveyDto) {
    return this.prisma.survey.update({
      where: { id },
      data,
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async deleteSurvey(id: string) {
    return this.prisma.survey.delete({
      where: { id },
    });
  }

  // Question Operations
  async createQuestion(surveyId: string, questionText: string, type: string) {
    const questionCount = await this.prisma.question.count({
      where: { surveyId },
    });

    return this.prisma.question.create({
      data: {
        text: questionText,
        type,
        order: questionCount,
        surveyId,
      },
    });
  }

  async updateQuestion(questionId: string, text: string, type: string) {
    return this.prisma.question.update({
      where: { id: questionId },
      data: { text, type },
    });
  }

  async deleteQuestion(questionId: string) {
    return this.prisma.question.delete({
      where: { id: questionId },
    });
  }

  // Survey Response Operations
  async getSurveyResponse(userId: string, surveyId: string) {
    return this.prisma.surveyResponse.findUnique({
      where: {
        userId_surveyId: { userId, surveyId },
      },
      include: {
        questionResponses: {
          include: {
            question: true,
          },
        },
        survey: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }

  async submitSurveyResponse(
    userId: string,
    surveyId: string,
    data: SubmitSurveyResponseDto,
  ) {
    // Create or update survey response
    const surveyResponse = await this.prisma.surveyResponse.upsert({
      where: {
        userId_surveyId: { userId, surveyId },
      },
      update: { updatedAt: new Date() },
      create: {
        userId,
        surveyId,
      },
    });

    // Delete old question responses
    await this.prisma.questionResponse.deleteMany({
      where: { surveyResponseId: surveyResponse.id },
    });

    // Create new question responses
    await this.prisma.questionResponse.createMany({
      data: data.responses.map((response) => ({
        surveyResponseId: surveyResponse.id,
        questionId: response.questionId,
        value: response.value,
      })),
    });

    // Return updated response with relations
    return this.getSurveyResponse(userId, surveyId);
  }

  async getUserSurveyResponses(userId: string) {
    return this.prisma.surveyResponse.findMany({
      where: { userId },
      include: {
        survey: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
        questionResponses: {
          include: {
            question: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
