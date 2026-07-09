import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { SurveysRepository } from '../repositories/surveys.repository';
import {
  CreateSurveyDto,
  UpdateSurveyDto,
  SubmitSurveyResponseDto,
} from '../dto/survey.dto';

describe('SurveysService', () => {
  let service: SurveysService;
  let repository: jest.Mocked<SurveysRepository>;

  const mockQuestion = {
    id: 'q-1',
    text: 'Question 1?',
    type: 'likert',
    order: 0,
    surveyId: 'survey-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSurvey = {
    id: 'survey-1',
    title: 'Test Survey',
    description: 'A test survey',
    questions: [mockQuestion],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SurveysService,
        {
          provide: SurveysRepository,
          useValue: {
            getAllSurveys: jest.fn(),
            getSurveyById: jest.fn(),
            createSurvey: jest.fn(),
            updateSurvey: jest.fn(),
            deleteSurvey: jest.fn(),
            createQuestion: jest.fn(),
            updateQuestion: jest.fn(),
            deleteQuestion: jest.fn(),
            getSurveyResponse: jest.fn(),
            getUserSurveyResponses: jest.fn(),
            submitSurveyResponse: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SurveysService>(SurveysService);
    repository = module.get(SurveysRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllSurveys', () => {
    it('should return all surveys', async () => {
      repository.getAllSurveys.mockResolvedValue([mockSurvey]);

      const result = await service.getAllSurveys();

      expect(result).toEqual([mockSurvey]);
      expect(repository.getAllSurveys).toHaveBeenCalled();
    });

    it('should return empty array when no surveys exist', async () => {
      repository.getAllSurveys.mockResolvedValue([]);

      const result = await service.getAllSurveys();

      expect(result).toEqual([]);
    });
  });

  describe('getSurveyById', () => {
    it('should return a survey by id', async () => {
      repository.getSurveyById.mockResolvedValue(mockSurvey);

      const result = await service.getSurveyById('survey-1');

      expect(result).toEqual(mockSurvey);
      expect(repository.getSurveyById).toHaveBeenCalledWith('survey-1');
    });

    it('should throw NotFoundException when survey does not exist', async () => {
      repository.getSurveyById.mockResolvedValue(null);

      await expect(service.getSurveyById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createSurvey', () => {
    it('should create a survey', async () => {
      const createDto: CreateSurveyDto = {
        title: 'New Survey',
        description: 'New survey description',
        questions: [
          {
            text: 'Q1?',
            type: 'likert',
          },
        ],
      };

      repository.createSurvey.mockResolvedValue(mockSurvey);

      const result = await service.createSurvey(createDto);

      expect(result).toEqual(mockSurvey);
      expect(repository.createSurvey).toHaveBeenCalledWith(createDto);
    });

    it('should throw BadRequestException when title is missing', async () => {
      const createDto: CreateSurveyDto = {
        title: '',
        questions: [],
      };

      await expect(service.createSurvey(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when no questions provided', async () => {
      const createDto: CreateSurveyDto = {
        title: 'New Survey',
        questions: [],
      };

      await expect(service.createSurvey(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateSurvey', () => {
    it('should update a survey', async () => {
      const updateDto: UpdateSurveyDto = {
        title: 'Updated Survey',
      };

      repository.getSurveyById.mockResolvedValue(mockSurvey);
      repository.updateSurvey.mockResolvedValue({
        ...mockSurvey,
        ...updateDto,
      });

      const result = await service.updateSurvey('survey-1', updateDto);

      expect(repository.updateSurvey).toHaveBeenCalledWith(
        'survey-1',
        updateDto,
      );
    });

    it('should throw NotFoundException when survey does not exist', async () => {
      repository.getSurveyById.mockResolvedValue(null);

      await expect(
        service.updateSurvey('nonexistent', { title: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteSurvey', () => {
    it('should delete a survey', async () => {
      repository.getSurveyById.mockResolvedValue(mockSurvey);
      repository.deleteSurvey.mockResolvedValue(mockSurvey);

      await service.deleteSurvey('survey-1');

      expect(repository.deleteSurvey).toHaveBeenCalledWith('survey-1');
    });

    it('should throw NotFoundException when survey does not exist', async () => {
      repository.getSurveyById.mockResolvedValue(null);

      await expect(service.deleteSurvey('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addQuestion', () => {
    it('should add a question to a survey', async () => {
      const newQuestion = {
        id: 'q-2',
        text: 'New question?',
        type: 'likert',
        order: 1,
        surveyId: 'survey-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.getSurveyById.mockResolvedValue(mockSurvey);
      repository.createQuestion.mockResolvedValue(newQuestion);

      const result = await service.addQuestion('survey-1', {
        text: 'New question?',
        type: 'likert',
      });

      expect(result).toEqual(newQuestion);
      expect(repository.createQuestion).toHaveBeenCalled();
    });

    it('should throw NotFoundException when survey does not exist', async () => {
      repository.getSurveyById.mockResolvedValue(null);

      await expect(
        service.addQuestion('nonexistent', {
          text: 'Q?',
          type: 'likert',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('submitSurveyResponse', () => {
    it('should submit a survey response', async () => {
      const submitDto: SubmitSurveyResponseDto = {
        responses: [
          {
            questionId: 'q-1',
            value: 4,
          },
        ],
      };

      const mockResponseData = {
        id: 'response-1',
        userId: 'user-1',
        surveyId: 'survey-1',
        questionResponses: [
          {
            id: 'qr-1',
            questionId: 'q-1',
            value: 4,
            surveyResponseId: 'response-1',
            question: mockQuestion,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        survey: mockSurvey,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.getSurveyById.mockResolvedValue(mockSurvey);
      repository.getSurveyResponse.mockResolvedValueOnce(null); // No existing response
      repository.submitSurveyResponse.mockResolvedValue(mockResponseData);

      const result = await service.submitSurveyResponse(
        'user-1',
        'survey-1',
        submitDto,
      );

      expect(result).toBeDefined();
      expect(repository.submitSurveyResponse).toHaveBeenCalledWith(
        'user-1',
        'survey-1',
        submitDto,
      );
    });

    it('should throw ConflictException when user already responded to survey', async () => {
      const submitDto: SubmitSurveyResponseDto = {
        responses: [
          {
            questionId: 'q-1',
            value: 3,
          },
        ],
      };

      const existingResponse = {
        id: 'existing-response',
        userId: 'user-1',
        surveyId: 'survey-1',
        questionResponses: [],
        survey: mockSurvey,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.getSurveyById.mockResolvedValue(mockSurvey);
      repository.getSurveyResponse.mockResolvedValue(existingResponse);

      await expect(
        service.submitSurveyResponse('user-1', 'survey-1', submitDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when response contains invalid question', async () => {
      const submitDto: SubmitSurveyResponseDto = {
        responses: [
          {
            questionId: 'invalid-q',
            value: 3,
          },
        ],
      };

      repository.getSurveyById.mockResolvedValue(mockSurvey);
      repository.getSurveyResponse.mockResolvedValue(null);

      await expect(
        service.submitSurveyResponse('user-1', 'survey-1', submitDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserSurveyResponse', () => {
    it('should get user survey response', async () => {
      const mockResponse = {
        id: 'response-1',
        userId: 'user-1',
        surveyId: 'survey-1',
        questionResponses: [],
        survey: mockSurvey,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.getSurveyResponse.mockResolvedValue(mockResponse);

      const result = await service.getUserSurveyResponse('user-1', 'survey-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('response-1');
    });

    it('should throw NotFoundException when response not found', async () => {
      repository.getSurveyResponse.mockResolvedValue(null);

      await expect(
        service.getUserSurveyResponse('user-1', 'survey-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
