import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateSurveyDto,
  UpdateSurveyDto,
  SubmitSurveyResponseDto,
} from '../dto/survey.dto';

const surveyResponseInclude = {
  questionResponses: {
    include: {
      question: true,
    },
  },
  survey: {
    include: {
      questions: {
        orderBy: { order: 'asc' as const },
      },
    },
  },
} satisfies Prisma.SurveyResponseInclude;

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

  /** Latest attempt for this user + survey, or null if none. */
  async getSurveyResponse(userId: string, surveyId: string) {
    return this.prisma.surveyResponse.findFirst({
      where: { userId, surveyId },
      orderBy: { attemptNumber: 'desc' },
      include: surveyResponseInclude,
    });
  }

  /** All attempts for this user + survey, oldest first. */
  async getUserSurveyResponsesForSurvey(userId: string, surveyId: string) {
    return this.prisma.surveyResponse.findMany({
      where: { userId, surveyId },
      orderBy: { attemptNumber: 'asc' },
      include: surveyResponseInclude,
    });
  }

  async submitSurveyResponse(
    userId: string,
    surveyId: string,
    data: SubmitSurveyResponseDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.surveyResponse.findFirst({
        where: { userId, surveyId },
        orderBy: { attemptNumber: 'desc' },
        select: { attemptNumber: true },
      });
      const attemptNumber = (latest?.attemptNumber ?? 0) + 1;

      return tx.surveyResponse.create({
        data: {
          userId,
          surveyId,
          attemptNumber,
          questionResponses: {
            create: data.responses.map((response) => ({
              questionId: response.questionId,
              value: response.value,
            })),
          },
        },
        include: surveyResponseInclude,
      });
    });
  }

  async getUserSurveyResponses(userId: string) {
    return this.prisma.surveyResponse.findMany({
      where: { userId },
      include: surveyResponseInclude,
      orderBy: [{ surveyId: 'asc' }, { attemptNumber: 'desc' }],
    });
  }
}
