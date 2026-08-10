import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SurveysRepository } from '../repositories/surveys.repository';
import {
  AnswerOptionDto,
  CreateSurveyDto,
  UpdateSurveyDto,
  SubmitSurveyResponseDto,
  SurveyDto,
  SurveyResponseDto,
} from '../dto/survey.dto';
import { TranslationService } from '../../translations/services/translation.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';
import { I18nService } from 'nestjs-i18n';
import { toSurveySlug } from '../utils/survey-slug.util';

type LocalizableQuestion = { id: string; text: string };

type LocalizableSurvey = {
  id: string;
  title: string;
  description?: string | null;
  questions?: LocalizableQuestion[];
  slug?: string;
};

/** Every question uses the same 5-point Likert scale. */
const LIKERT5_VALUES = [1, 2, 3, 4, 5] as const;

const LIKERT5_ENGLISH: Record<number, string> = {
  1: 'Strongly disagree',
  2: 'Disagree',
  3: 'Neither agree nor disagree',
  4: 'Agree',
  5: 'Strongly agree',
};

@Injectable()
export class SurveysService {
  constructor(
    private readonly surveysRepository: SurveysRepository,
    private readonly translationService: TranslationService,
    private readonly i18n: I18nService,
  ) {}

  /** Localized answer options, shared by all questions of all surveys. */
  private likertScale(locale: string): AnswerOptionDto[] {
    return LIKERT5_VALUES.map((value) => {
      const label = this.i18n.translate(`surveys.likert5.${value}`, {
        lang: locale,
        defaultValue: LIKERT5_ENGLISH[value],
      });
      return {
        value,
        label: typeof label === 'string' ? label : LIKERT5_ENGLISH[value],
      };
    });
  }

  private mapSurveyToDto(survey: any): SurveyDto {
    return survey as SurveyDto;
  }

  private mapSurveyResponseToDto(response: any): SurveyResponseDto {
    return {
      ...response,
      responses: response.questionResponses,
    } as SurveyResponseDto;
  }

  /** Translated title/description per survey id (English values as fallback). */
  private async resolveSurveyFields(
    surveys: LocalizableSurvey[],
    locale: string,
  ): Promise<Record<string, Record<string, string | null>>> {
    if (surveys.length === 0) {
      return {};
    }
    return this.translationService.resolveMany(
      'Survey',
      surveys.map((s) => s.id),
      locale,
      ['title', 'description'],
      Object.fromEntries(
        surveys.map((s) => [
          s.id,
          { title: s.title, description: s.description },
        ]),
      ),
    );
  }

  /** Translated text per question id (English values as fallback). */
  private async resolveQuestionTexts(
    questions: LocalizableQuestion[],
    locale: string,
  ): Promise<Record<string, Record<string, string | null>>> {
    if (questions.length === 0) {
      return {};
    }
    return this.translationService.resolveMany(
      'Question',
      questions.map((q) => q.id),
      locale,
      ['text'],
      Object.fromEntries(questions.map((q) => [q.id, { text: q.text }])),
    );
  }

  /**
   * Attach the localized answer scale to every question and, for non-default
   * locales, overlay survey/question translations.
   */
  private async localizeSurveys<T extends LocalizableSurvey>(
    surveys: T[],
    lang?: string,
  ): Promise<T[]> {
    const locale = this.translationService.resolveLocale(lang);
    const answers = this.likertScale(locale);

    if (surveys.length === 0) {
      return surveys;
    }

    if (locale === DEFAULT_LOCALE) {
      return surveys.map((survey) =>
        this.withAnswers(
          // `slug` is placed before the spread so it keeps this key order in
          // the response — an object spread appends keys the source didn't
          // already have, so writing it after `...survey` pushes it last.
          { slug: toSurveySlug(survey.title), ...survey },
          answers,
        ),
      );
    }

    const questions = surveys.flatMap((s) => s.questions ?? []);
    const [surveyFields, questionTexts] = await Promise.all([
      this.resolveSurveyFields(surveys, locale),
      this.resolveQuestionTexts(questions, locale),
    ]);

    return surveys.map((survey) =>
      this.withAnswers(
        {
          slug: toSurveySlug(survey.title),
          ...survey,
          title: surveyFields[survey.id]?.title ?? survey.title,
          description:
            surveyFields[survey.id]?.description ?? survey.description,
        },
        answers,
        questionTexts,
      ),
    );
  }

  private withAnswers<T extends LocalizableSurvey>(
    survey: T,
    answers: AnswerOptionDto[],
    questionTexts?: Record<string, Record<string, string | null>>,
  ): T {
    if (!survey.questions) {
      return survey;
    }
    return {
      ...survey,
      questions: survey.questions.map((question) => ({
        ...question,
        text: questionTexts?.[question.id]?.text ?? question.text,
        answers,
      })),
    };
  }

  /**
   * Attach the answer scale to and overlay translations on the survey and
   * question objects embedded in a survey response payload.
   */
  private async localizeSurveyResponses<T extends Record<string, any>>(
    responses: T[],
    lang?: string,
  ): Promise<T[]> {
    const locale = this.translationService.resolveLocale(lang);
    const answers = this.likertScale(locale);
    if (responses.length === 0) {
      return responses;
    }

    const embeddedQuestions: LocalizableQuestion[] = responses.flatMap(
      (r) =>
        r.questionResponses
          ?.map((qr: any) => qr.question)
          .filter(Boolean) as LocalizableQuestion[],
    );
    const surveys = responses
      .map((r) => r.survey)
      .filter(Boolean) as LocalizableSurvey[];

    const [localizedSurveys, questionTexts] = await Promise.all([
      this.localizeSurveys(surveys, locale),
      locale === DEFAULT_LOCALE
        ? Promise.resolve({})
        : this.resolveQuestionTexts(embeddedQuestions, locale),
    ]);
    const surveyById = new Map(localizedSurveys.map((s) => [s.id, s]));

    return responses.map((response) => ({
      ...response,
      survey: response.survey
        ? (surveyById.get(response.survey.id) ?? response.survey)
        : response.survey,
      questionResponses: response.questionResponses?.map((qr: any) => ({
        ...qr,
        question: qr.question
          ? {
              ...qr.question,
              text: questionTexts[qr.question.id]?.text ?? qr.question.text,
              answers,
            }
          : qr.question,
      })),
    }));
  }

  // Survey Operations
  async getAllSurveys(lang?: string): Promise<SurveyDto[]> {
    const surveys = await this.surveysRepository.getAllSurveys();
    const localized = await this.localizeSurveys(surveys, lang);
    return localized.map((s) => this.mapSurveyToDto(s));
  }

  async getSurveyById(id: string, lang?: string): Promise<SurveyDto> {
    const survey = await this.surveysRepository.getSurveyById(id);
    if (!survey) {
      throw new NotFoundException(`Survey with id ${id} not found`);
    }
    const [localized] = await this.localizeSurveys([survey], lang);
    return this.mapSurveyToDto(localized);
  }

  /**
   * Look up a survey by its slug (see toSurveySlug — derived from `title`,
   * not stored). Fine to scan the full list given the current survey count;
   * revisit if that stops being small.
   */
  async getSurveyBySlug(slug: string, lang?: string): Promise<SurveyDto> {
    const surveys = await this.surveysRepository.getAllSurveys();
    const survey = surveys.find((s) => toSurveySlug(s.title) === slug);
    if (!survey) {
      throw new NotFoundException(`Survey with slug ${slug} not found`);
    }
    const [localized] = await this.localizeSurveys([survey], lang);
    return this.mapSurveyToDto(localized);
  }

  async createSurvey(data: CreateSurveyDto): Promise<SurveyDto> {
    if (!data.title || data.title.trim().length === 0) {
      throw new BadRequestException(
        'Survey title is required and cannot be empty',
      );
    }

    if (!data.questions || data.questions.length === 0) {
      throw new BadRequestException('Survey must have at least one question');
    }

    for (const question of data.questions) {
      if (!question.text || question.text.trim().length === 0) {
        throw new BadRequestException('Question text cannot be empty');
      }
    }

    const survey = await this.surveysRepository.createSurvey(data);
    const [localized] = await this.localizeSurveys([survey]);
    return this.mapSurveyToDto(localized);
  }

  async updateSurvey(id: string, data: UpdateSurveyDto): Promise<SurveyDto> {
    const survey = await this.surveysRepository.getSurveyById(id);
    if (!survey) {
      throw new NotFoundException(`Survey with id ${id} not found`);
    }
    const updated = await this.surveysRepository.updateSurvey(id, data);
    const [localized] = await this.localizeSurveys([updated]);
    return this.mapSurveyToDto(localized);
  }

  async deleteSurvey(id: string): Promise<void> {
    const survey = await this.surveysRepository.getSurveyById(id);
    if (!survey) {
      throw new NotFoundException(`Survey with id ${id} not found`);
    }
    for (const question of survey.questions) {
      await this.translationService.deleteForEntity('Question', question.id);
    }
    await this.translationService.deleteForEntity('Survey', id);
    await this.surveysRepository.deleteSurvey(id);
  }

  // Question Operations
  async addQuestion(
    surveyId: string,
    questionData: { text: string; type: string },
  ) {
    const survey = await this.surveysRepository.getSurveyById(surveyId);
    if (!survey) {
      throw new NotFoundException(`Survey with id ${surveyId} not found`);
    }

    if (!questionData.text || questionData.text.trim().length === 0) {
      throw new BadRequestException('Question text is required');
    }

    return this.surveysRepository.createQuestion(
      surveyId,
      questionData.text,
      questionData.type,
    );
  }

  async updateQuestion(questionId: string, text: string, type: string) {
    return this.surveysRepository.updateQuestion(questionId, text, type);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    await this.translationService.deleteForEntity('Question', questionId);
    await this.surveysRepository.deleteQuestion(questionId);
  }

  // Survey Response Operations
  async submitSurveyResponse(
    userId: string,
    surveyId: string,
    data: SubmitSurveyResponseDto,
  ): Promise<SurveyResponseDto> {
    const survey = await this.surveysRepository.getSurveyById(surveyId);
    if (!survey) {
      throw new NotFoundException(`Survey with id ${surveyId} not found`);
    }

    const questionIds = new Set(survey.questions.map((q) => q.id));
    for (const response of data.responses) {
      if (!questionIds.has(response.questionId)) {
        throw new BadRequestException(
          `Question ${response.questionId} does not belong to survey ${surveyId}`,
        );
      }
    }

    const result = await this.surveysRepository.submitSurveyResponse(
      userId,
      surveyId,
      { responses: data.responses },
    );
    return this.mapSurveyResponseToDto(result);
  }

  /** Latest attempt for this user + survey. */
  async getUserSurveyResponse(
    userId: string,
    surveyId: string,
    lang?: string,
  ): Promise<SurveyResponseDto> {
    const response = await this.surveysRepository.getSurveyResponse(
      userId,
      surveyId,
    );
    if (!response) {
      throw new NotFoundException(
        `No response found for user ${userId} on survey ${surveyId}`,
      );
    }
    const [localized] = await this.localizeSurveyResponses([response], lang);
    return this.mapSurveyResponseToDto(localized);
  }

  /** All attempts for this user + survey, oldest first. */
  async getUserSurveyResponsesForSurvey(
    userId: string,
    surveyId: string,
    lang?: string,
  ): Promise<SurveyResponseDto[]> {
    const survey = await this.surveysRepository.getSurveyById(surveyId);
    if (!survey) {
      throw new NotFoundException(`Survey with id ${surveyId} not found`);
    }

    const responses =
      await this.surveysRepository.getUserSurveyResponsesForSurvey(
        userId,
        surveyId,
      );
    const localized = await this.localizeSurveyResponses(responses, lang);
    return localized.map((r) => this.mapSurveyResponseToDto(r));
  }

  async getUserSurveyResponses(userId: string, lang?: string) {
    const responses =
      await this.surveysRepository.getUserSurveyResponses(userId);
    const localized = await this.localizeSurveyResponses(responses, lang);
    return localized.map((r) => this.mapSurveyResponseToDto(r));
  }
}
