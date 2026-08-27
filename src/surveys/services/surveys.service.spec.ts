import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { SurveysRepository } from '../repositories/surveys.repository';
import {
  CreateSurveyDto,
  UpdateSurveyDto,
  SubmitSurveyResponseDto,
} from '../dto/survey.dto';
import { TranslationService } from '../../translations/services/translation.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';
import { I18nService } from 'nestjs-i18n';

/** What the i18n mock resolves to for the default locale. */
const ENGLISH_SCALE = [
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neither agree nor disagree' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly agree' },
];

describe('SurveysService', () => {
  let service: SurveysService;
  let repository: jest.Mocked<SurveysRepository>;
  let translationService: jest.Mocked<TranslationService>;

  const mockQuestion = {
    id: 'q-1',
    key: null,
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

  type ResolvedTranslations = Record<
    string,
    Record<string, Record<string, string | null>>
  >;

  /** Stub resolveMany with per-entity-type translation rows. */
  const mockTranslations = (byEntityType: ResolvedTranslations) => {
    translationService.resolveMany.mockImplementation((entityType: string) =>
      Promise.resolve(byEntityType[entityType] ?? {}),
    );
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
            getUserSurveyResponsesForSurvey: jest.fn(),
            submitSurveyResponse: jest.fn(),
          },
        },
        {
          provide: TranslationService,
          useValue: {
            resolveLocale: jest.fn((lang?: string) => lang ?? DEFAULT_LOCALE),
            resolveMany: jest.fn().mockResolvedValue({}),
            deleteForEntity: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn(
              (
                key: string,
                options?: { lang?: string; defaultValue?: string },
              ) =>
                options?.lang && options.lang !== DEFAULT_LOCALE
                  ? `${options.lang}:${key}`
                  : options?.defaultValue,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<SurveysService>(SurveysService);
    repository = module.get(SurveysRepository);
    translationService = module.get(TranslationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllSurveys', () => {
    it('should return all surveys', async () => {
      repository.getAllSurveys.mockResolvedValue([mockSurvey]);

      const result = await service.getAllSurveys();

      expect(result).toEqual([
        {
          ...mockSurvey,
          slug: 'test-survey',
          questions: [{ ...mockQuestion, answers: ENGLISH_SCALE }],
        },
      ]);
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

      expect(result).toEqual({
        ...mockSurvey,
        slug: 'test-survey',
        questions: [{ ...mockQuestion, answers: ENGLISH_SCALE }],
      });
      expect(repository.getSurveyById).toHaveBeenCalledWith('survey-1');
    });

    it('should throw NotFoundException when survey does not exist', async () => {
      repository.getSurveyById.mockResolvedValue(null);

      await expect(service.getSurveyById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSurveyBySlug', () => {
    it('should find a survey by its derived slug', async () => {
      repository.getAllSurveys.mockResolvedValue([mockSurvey]);

      const result = await service.getSurveyBySlug('test-survey');

      expect(result).toEqual({
        ...mockSurvey,
        slug: 'test-survey',
        questions: [{ ...mockQuestion, answers: ENGLISH_SCALE }],
      });
    });

    it('should throw NotFoundException when no survey matches the slug', async () => {
      repository.getAllSurveys.mockResolvedValue([mockSurvey]);

      await expect(service.getSurveyBySlug('does-not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should localize title/description while keeping the slug stable', async () => {
      repository.getAllSurveys.mockResolvedValue([mockSurvey]);
      mockTranslations({
        Survey: { 'survey-1': { title: 'Test-Umfrage', description: null } },
      });

      const result = await service.getSurveyBySlug('test-survey', 'de');

      expect(result.slug).toBe('test-survey');
      expect(result.title).toBe('Test-Umfrage');
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

      expect(result).toEqual({
        ...mockSurvey,
        slug: 'test-survey',
        questions: [{ ...mockQuestion, answers: ENGLISH_SCALE }],
      });
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

      expect(result.title).toBe('Updated Survey');
    });

    it('should throw NotFoundException when survey does not exist', async () => {
      repository.getSurveyById.mockResolvedValue(null);

      await expect(
        service.updateSurvey('nonexistent', { title: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should attach slug and answers, like the read endpoints do', async () => {
      repository.getSurveyById.mockResolvedValue(mockSurvey);
      repository.updateSurvey.mockResolvedValue(mockSurvey);

      const result = await service.updateSurvey('survey-1', {
        title: 'Test Survey',
      });

      expect(result.slug).toBe('test-survey');
      expect(result.questions[0].answers).toEqual(ENGLISH_SCALE);
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
        key: null,
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
        attemptNumber: 1,
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
      repository.submitSurveyResponse.mockResolvedValue(mockResponseData);

      const result = await service.submitSurveyResponse(
        'user-1',
        'survey-1',
        submitDto,
      );

      expect(result).toBeDefined();
      expect(result.attemptNumber).toBe(1);
      expect(repository.submitSurveyResponse).toHaveBeenCalledWith(
        'user-1',
        'survey-1',
        submitDto,
      );
      expect(repository.getSurveyResponse).not.toHaveBeenCalled();
    });

    it('should allow submitting the same survey again as a new attempt', async () => {
      const submitDto: SubmitSurveyResponseDto = {
        responses: [
          {
            questionId: 'q-1',
            value: 2,
          },
        ],
      };

      const mockResponseData = {
        id: 'response-2',
        userId: 'user-1',
        surveyId: 'survey-1',
        attemptNumber: 2,
        questionResponses: [
          {
            id: 'qr-2',
            questionId: 'q-1',
            value: 2,
            surveyResponseId: 'response-2',
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
      repository.submitSurveyResponse.mockResolvedValue(mockResponseData);

      const result = await service.submitSurveyResponse(
        'user-1',
        'survey-1',
        submitDto,
      );

      expect(result.id).toBe('response-2');
      expect(result.attemptNumber).toBe(2);
      expect(repository.submitSurveyResponse).toHaveBeenCalledWith(
        'user-1',
        'survey-1',
        submitDto,
      );
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

      await expect(
        service.submitSurveyResponse('user-1', 'survey-1', submitDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserSurveyResponse', () => {
    it('should get the latest user survey response', async () => {
      const mockResponse = {
        id: 'response-2',
        userId: 'user-1',
        surveyId: 'survey-1',
        attemptNumber: 2,
        questionResponses: [],
        survey: mockSurvey,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.getSurveyResponse.mockResolvedValue(mockResponse);

      const result = await service.getUserSurveyResponse('user-1', 'survey-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('response-2');
      expect(result.attemptNumber).toBe(2);
    });

    it('should throw NotFoundException when response not found', async () => {
      repository.getSurveyResponse.mockResolvedValue(null);

      await expect(
        service.getUserSurveyResponse('user-1', 'survey-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserSurveyResponsesForSurvey', () => {
    it('should return all attempts for a survey oldest first', async () => {
      const mockResponses = [
        {
          id: 'response-1',
          userId: 'user-1',
          surveyId: 'survey-1',
          attemptNumber: 1,
          questionResponses: [],
          survey: mockSurvey,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'response-2',
          userId: 'user-1',
          surveyId: 'survey-1',
          attemptNumber: 2,
          questionResponses: [],
          survey: mockSurvey,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      repository.getSurveyById.mockResolvedValue(mockSurvey);
      repository.getUserSurveyResponsesForSurvey.mockResolvedValue(
        mockResponses,
      );

      const result = await service.getUserSurveyResponsesForSurvey(
        'user-1',
        'survey-1',
      );

      expect(result).toHaveLength(2);
      expect(result[0].attemptNumber).toBe(1);
      expect(result[1].attemptNumber).toBe(2);
      expect(repository.getUserSurveyResponsesForSurvey).toHaveBeenCalledWith(
        'user-1',
        'survey-1',
      );
    });

    it('should throw NotFoundException when survey does not exist', async () => {
      repository.getSurveyById.mockResolvedValue(null);

      await expect(
        service.getUserSurveyResponsesForSurvey('user-1', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('translations', () => {
    it('should not query translations for the default locale', async () => {
      repository.getAllSurveys.mockResolvedValue([mockSurvey]);

      const result = await service.getAllSurveys();

      expect(translationService.resolveMany).not.toHaveBeenCalled();
      expect(result[0].title).toBe('Test Survey');
    });

    it('should overlay survey and question translations for lang', async () => {
      repository.getAllSurveys.mockResolvedValue([mockSurvey]);
      mockTranslations({
        Survey: {
          'survey-1': {
            title: 'Test-Umfrage',
            description: 'Eine Testumfrage',
          },
        },
        Question: { 'q-1': { text: 'Frage 1?' } },
      });

      const [survey] = await service.getAllSurveys('de');

      expect(survey.title).toBe('Test-Umfrage');
      expect(survey.description).toBe('Eine Testumfrage');
      expect(survey.questions[0].text).toBe('Frage 1?');
      expect(translationService.resolveMany).toHaveBeenCalledWith(
        'Survey',
        ['survey-1'],
        'de',
        ['title', 'description'],
        expect.any(Object),
      );
      expect(translationService.resolveMany).toHaveBeenCalledWith(
        'Question',
        ['q-1'],
        'de',
        ['text'],
        expect.any(Object),
      );
    });

    it('should keep English values when a translation is missing', async () => {
      repository.getSurveyById.mockResolvedValue(mockSurvey);
      translationService.resolveMany.mockResolvedValue({});

      const survey = await service.getSurveyById('survey-1', 'de');

      expect(survey.title).toBe('Test Survey');
      expect(survey.questions[0].text).toBe('Question 1?');
    });

    it('should translate questions embedded in a survey response', async () => {
      repository.getSurveyResponse.mockResolvedValue({
        id: 'response-1',
        userId: 'user-1',
        surveyId: 'survey-1',
        survey: mockSurvey,
        questionResponses: [
          { id: 'qr-1', questionId: 'q-1', value: 3, question: mockQuestion },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockTranslations({
        Survey: { 'survey-1': { title: 'Test-Umfrage', description: null } },
        Question: { 'q-1': { text: 'Frage 1?' } },
      });

      const result = await service.getUserSurveyResponse(
        'user-1',
        'survey-1',
        'de',
      );

      expect(result.responses[0].question?.text).toBe('Frage 1?');
    });

    it('should derive a slug from the English title, regardless of locale', async () => {
      repository.getAllSurveys.mockResolvedValue([mockSurvey]);
      mockTranslations({
        Survey: { 'survey-1': { title: 'Test-Umfrage', description: null } },
      });

      const [enResult] = await service.getAllSurveys();
      const [deResult] = await service.getAllSurveys('de');

      expect(enResult.slug).toBe('test-survey');
      expect(deResult.slug).toBe('test-survey');
      expect(deResult.title).toBe('Test-Umfrage');
    });

    it('should place slug before title in key order (not appended last)', async () => {
      repository.getAllSurveys.mockResolvedValue([mockSurvey]);

      const [survey] = await service.getAllSurveys();

      const keys = Object.keys(survey);
      expect(keys.indexOf('slug')).toBeLessThan(keys.indexOf('title'));
    });

    it('should attach the English answer scale by default', async () => {
      repository.getAllSurveys.mockResolvedValue([mockSurvey]);

      const [survey] = await service.getAllSurveys();

      expect(survey.questions[0].answers).toEqual(ENGLISH_SCALE);
    });

    it('should localize the answer scale', async () => {
      repository.getAllSurveys.mockResolvedValue([mockSurvey]);

      const [survey] = await service.getAllSurveys('de');

      expect(survey.questions[0].answers).toEqual([
        { value: 1, label: 'de:surveys.likert5.1' },
        { value: 2, label: 'de:surveys.likert5.2' },
        { value: 3, label: 'de:surveys.likert5.3' },
        { value: 4, label: 'de:surveys.likert5.4' },
        { value: 5, label: 'de:surveys.likert5.5' },
      ]);
    });

    it('should attach the answer scale to questions in a response', async () => {
      repository.getSurveyResponse.mockResolvedValue({
        id: 'response-1',
        userId: 'user-1',
        surveyId: 'survey-1',
        survey: mockSurvey,
        questionResponses: [
          { id: 'qr-1', questionId: 'q-1', value: 3, question: mockQuestion },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.getUserSurveyResponse('user-1', 'survey-1');

      expect(result.responses[0].question?.answers).toEqual(ENGLISH_SCALE);
    });

    it('should delete translations along with a survey', async () => {
      repository.getSurveyById.mockResolvedValue(mockSurvey);

      await service.deleteSurvey('survey-1');

      expect(translationService.deleteForEntity).toHaveBeenCalledWith(
        'Question',
        'q-1',
      );
      expect(translationService.deleteForEntity).toHaveBeenCalledWith(
        'Survey',
        'survey-1',
      );
    });
  });
});
