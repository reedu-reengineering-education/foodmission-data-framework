import { Prisma } from '@prisma/client';
import { SurveysRepository } from './surveys.repository';
import { PrismaService } from '../../database/prisma.service';
import { SubmitSurveyResponseDto } from '../dto/survey.dto';

describe('SurveysRepository', () => {
  let repository: SurveysRepository;
  let prisma: {
    $transaction: jest.Mock;
    surveyResponse: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  const submitDto: SubmitSurveyResponseDto = {
    responses: [{ questionId: 'q-1', value: 4 }],
  };

  const createdResponse = {
    id: 'response-2',
    userId: 'user-1',
    surveyId: 'survey-1',
    attemptNumber: 2,
    questionResponses: [],
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      surveyResponse: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    repository = new SurveysRepository(prisma as unknown as PrismaService);
  });

  describe('submitSurveyResponse', () => {
    it('creates a new attempt with the next attemptNumber', async () => {
      prisma.surveyResponse.findFirst.mockResolvedValue({ attemptNumber: 1 });
      prisma.surveyResponse.create.mockResolvedValue(createdResponse);
      prisma.$transaction.mockImplementation(async (cb) => await cb(prisma));

      const result = await repository.submitSurveyResponse(
        'user-1',
        'survey-1',
        submitDto,
      );

      expect(result).toEqual(createdResponse);
      expect(prisma.surveyResponse.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            surveyId: 'survey-1',
            attemptNumber: 2,
          }),
        }),
      );
    });

    it('retries on P2002 unique-constraint race and succeeds', async () => {
      const uniqueError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '6.0.0' },
      );

      prisma.$transaction
        .mockRejectedValueOnce(uniqueError)
        .mockImplementationOnce(async (cb) => {
          prisma.surveyResponse.findFirst.mockResolvedValue({
            attemptNumber: 1,
          });
          prisma.surveyResponse.create.mockResolvedValue(createdResponse);
          return await cb(prisma);
        });

      const result = await repository.submitSurveyResponse(
        'user-1',
        'survey-1',
        submitDto,
      );

      expect(result).toEqual(createdResponse);
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('rethrows after exhausting P2002 retries', async () => {
      const uniqueError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '6.0.0' },
      );
      prisma.$transaction.mockRejectedValue(uniqueError);

      await expect(
        repository.submitSurveyResponse('user-1', 'survey-1', submitDto),
      ).rejects.toBe(uniqueError);
      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    });
  });
});
