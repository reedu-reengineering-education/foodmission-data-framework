import { ConflictException, Injectable, Optional } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/constants';
import { deriveUserSegment } from '../onboarding-scoring';
import {
  ONBOARDING_SURVEY_QUESTIONS,
  OnboardingSurveyQuestion,
} from '../onboarding-survey.config';
import { GamificationOnboardingService } from './gamification-onboarding.service';
import { ProgressWheelService } from './progress-wheel.service';
import {
  OnboardingSurveyAnswersDto,
  OnboardingSurveyResultDto,
} from '../dto/onboarding-survey.dto';

@Injectable()
export class OnboardingSurveyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamificationOnboardingService: GamificationOnboardingService,
    private readonly progressWheelService: ProgressWheelService,
    // Global I18nModule from app.module.ts; optional so module graphs built
    // without the app root (wiring specs, e2e fixtures) still resolve.
    @Optional() private readonly i18n?: I18nService,
  ) {}

  /**
   * Survey questions with texts and option labels from
   * `onboarding-survey.questions.<field>` in the requested locale; falls back to the
   * English config for unsupported locales, missing keys, or no I18nModule.
   */
  getSurveyQuestions(lang?: string): readonly OnboardingSurveyQuestion[] {
    const i18n = this.i18n;
    const locale = (lang ?? DEFAULT_LOCALE).trim().toLowerCase();
    if (
      !i18n ||
      locale === DEFAULT_LOCALE ||
      !(SUPPORTED_LOCALES as readonly string[]).includes(locale)
    ) {
      return ONBOARDING_SURVEY_QUESTIONS;
    }

    const translate = (key: string, fallback: string): string => {
      const value = i18n.translate(`onboarding-survey.questions.${key}`, {
        lang: locale,
        defaultValue: fallback,
      });
      return typeof value === 'string' ? value : fallback;
    };

    return ONBOARDING_SURVEY_QUESTIONS.map((question) => ({
      ...question,
      text: translate(`${question.field}.text`, question.text),
      options: question.options.map((option) => ({
        ...option,
        label: translate(
          `${question.field}.options.${option.value}`,
          option.label,
        ),
      })),
    }));
  }

  /**
   * Scores the answers (all optional) into a sustainability profile,
   * persists them + segment, applies first-time onboarding side effects
   * (wallet, progress wheels, per-dimension levels; idempotent), and returns
   * the computed segment with the wheels.
   */
  async submitSurvey(
    userId: string,
    answers: OnboardingSurveyAnswersDto,
  ): Promise<OnboardingSurveyResultDto> {
    const segment = deriveUserSegment(answers);

    const onboardingResult = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { ...answers, segment },
      });

      const result =
        await this.gamificationOnboardingService.applyOnboardingSideEffects(
          user,
          segment,
          tx,
        );

      if (result.skipped) {
        throw new ConflictException('Onboarding survey already submitted');
      }

      return result;
    });

    const progressWheels =
      await this.progressWheelService.getWheelsForUser(userId);

    return { segment: onboardingResult.segment, progressWheels };
  }
}
