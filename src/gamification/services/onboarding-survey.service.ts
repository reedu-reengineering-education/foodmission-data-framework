import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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
  ) {}

  getSurveyQuestions(): readonly OnboardingSurveyQuestion[] {
    return ONBOARDING_SURVEY_QUESTIONS;
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
