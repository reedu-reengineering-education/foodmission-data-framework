import { SurveysController } from './surveys.controller';
import { SurveysService } from '../services/surveys.service';
import { CreateSurveyDto, SubmitSurveyResponseDto } from '../dto/survey.dto';

describe('SurveysController', () => {
  let controller: SurveysController;
  let service: jest.Mocked<SurveysService>;

  const mockSurvey = {
    id: 'survey-1',
    title: 'Test Survey',
    description: 'A test survey',
    questions: [
      {
        id: 'q-1',
        text: 'Question 1?',
        type: 'likert',
        order: 0,
        surveyId: 'survey-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    sub: 'user-1',
    email: 'test@example.com',
  };

  beforeEach(() => {
    const mockSurveysService = {
      getAllSurveys: jest.fn(),
      getSurveyById: jest.fn(),
      createSurvey: jest.fn(),
      updateSurvey: jest.fn(),
      deleteSurvey: jest.fn(),
      addQuestion: jest.fn(),
      updateQuestion: jest.fn(),
      deleteQuestion: jest.fn(),
      submitSurveyResponse: jest.fn(),
      getUserSurveyResponse: jest.fn(),
      getUserSurveyResponses: jest.fn(),
    };

    // Create a simple test instance without full module resolution
    controller = new SurveysController(mockSurveysService as any);
    service = mockSurveysService as any;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllSurveys', () => {
    it('should return all surveys', async () => {
      service.getAllSurveys.mockResolvedValue([mockSurvey]);

      const result = await controller.getAllSurveys();

      expect(result).toEqual([mockSurvey]);
      expect(service.getAllSurveys).toHaveBeenCalled();
    });
  });

  describe('getSurveyById', () => {
    it('should return a survey by id', async () => {
      service.getSurveyById.mockResolvedValue(mockSurvey);

      const result = await controller.getSurveyById('survey-1');

      expect(result).toEqual(mockSurvey);
      expect(service.getSurveyById).toHaveBeenCalledWith('survey-1');
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

      service.createSurvey.mockResolvedValue(mockSurvey);

      const result = await controller.createSurvey(createDto);

      expect(result).toEqual(mockSurvey);
      expect(service.createSurvey).toHaveBeenCalledWith(createDto);
    });
  });

  describe('updateSurvey', () => {
    it('should update a survey', async () => {
      const updateDto = { title: 'Updated Survey' };
      const updatedSurvey = { ...mockSurvey, ...updateDto };

      service.updateSurvey.mockResolvedValue(updatedSurvey);

      const result = await controller.updateSurvey('survey-1', updateDto);

      expect(result).toEqual(updatedSurvey);
      expect(service.updateSurvey).toHaveBeenCalledWith('survey-1', updateDto);
    });
  });

  describe('deleteSurvey', () => {
    it('should delete a survey', async () => {
      service.deleteSurvey.mockResolvedValue(undefined);

      await controller.deleteSurvey('survey-1');

      expect(service.deleteSurvey).toHaveBeenCalledWith('survey-1');
    });
  });

  describe('addQuestion', () => {
    it('should add a question', async () => {
      const questionDto = {
        text: 'New question?',
        type: 'likert',
      };

      const newQuestion = {
        id: 'q-2',
        text: 'New question?',
        type: 'likert',
        order: 1,
        surveyId: 'survey-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.addQuestion.mockResolvedValue(newQuestion);

      const result = await controller.addQuestion('survey-1', questionDto);

      expect(result).toEqual(newQuestion);
      expect(service.addQuestion).toHaveBeenCalledWith('survey-1', questionDto);
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

      const mockResponse = {
        id: 'response-1',
        userId: 'user-1',
        surveyId: 'survey-1',
        responses: [
          {
            id: 'qr-1',
            questionId: 'q-1',
            value: 4,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.submitSurveyResponse.mockResolvedValue(mockResponse);

      const result = await controller.submitSurveyResponse(
        'survey-1',
        submitDto,
        mockUser,
      );

      expect(result).toEqual(mockResponse);
      expect(service.submitSurveyResponse).toHaveBeenCalledWith(
        'user-1',
        'survey-1',
        {
          responses: submitDto.responses,
        },
      );
    });
  });

  describe('getUserSurveyResponse', () => {
    it('should get user survey response', async () => {
      const mockResponse = {
        id: 'response-1',
        userId: 'user-1',
        surveyId: 'survey-1',
        responses: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.getUserSurveyResponse.mockResolvedValue(mockResponse);

      const result = await controller.getUserSurveyResponse(
        'survey-1',
        mockUser,
      );

      expect(result).toEqual(mockResponse);
      expect(service.getUserSurveyResponse).toHaveBeenCalledWith(
        'user-1',
        'survey-1',
      );
    });
  });

  describe('getUserSurveyResponses', () => {
    it('should get all user survey responses', async () => {
      const mockResponses = [
        {
          id: 'response-1',
          userId: 'user-1',
          surveyId: 'survey-1',
          responses: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      service.getUserSurveyResponses.mockResolvedValue(mockResponses);

      const result = await controller.getUserSurveyResponses(mockUser);

      expect(result).toEqual(mockResponses);
      expect(service.getUserSurveyResponses).toHaveBeenCalledWith('user-1');
    });
  });
});
