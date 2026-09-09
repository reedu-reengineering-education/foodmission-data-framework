import { Test, TestingModule } from '@nestjs/testing';
import {
  UserSegment,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { OnboardingSurveyService } from './onboarding-survey.service';
import { GamificationOnboardingService } from './gamification-onboarding.service';
import { ProgressWheelService } from './progress-wheel.service';
import { ONBOARDING_SURVEY_QUESTIONS } from '../onboarding-survey.config';

describe('OnboardingSurveyService', () => {
  let service: OnboardingSurveyService;
  let prisma: { user: { update: jest.Mock } };
  let gamificationOnboardingService: jest.Mocked<
    Pick<GamificationOnboardingService, 'applyOnboardingSideEffects'>
  >;
  let progressWheelService: jest.Mocked<
    Pick<ProgressWheelService, 'getWheelsForUser'>
  >;

  const answers = {
    weeklyMeatConsumption: WeeklyMeatRange.ZERO_TO_FOUR,
    weeklyBeefConsumption: WeeklyBeefFrequency.NEVER,
    weeklyFoodWaste: WeeklyFoodWasteRange.ZERO,
    weeklyUpfConsumption: WeeklyUpfRange.ZERO_TO_THREE,
    weeklyReusableOrRefill: WeeklyReusableRange.TEN_PLUS,
  };

  beforeEach(async () => {
    prisma = { user: { update: jest.fn() } };
    gamificationOnboardingService = {
      applyOnboardingSideEffects: jest.fn().mockResolvedValue({
        segment: UserSegment.ADVANCED,
        walletEnsured: true,
        onboardingEventRecorded: true,
        skipped: false,
      }),
    };
    progressWheelService = {
      getWheelsForUser: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingSurveyService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: GamificationOnboardingService,
          useValue: gamificationOnboardingService,
        },
        { provide: ProgressWheelService, useValue: progressWheelService },
      ],
    }).compile();

    service = module.get(OnboardingSurveyService);
  });

  it('returns the static survey questions', () => {
    expect(service.getSurveyQuestions()).toBe(ONBOARDING_SURVEY_QUESTIONS);
  });

  it('scores the answers, persists them, applies onboarding side effects, and returns the wheels', async () => {
    const updatedUser = { id: 'u1', segment: UserSegment.ADVANCED };
    prisma.user.update.mockResolvedValue(updatedUser);
    const wheels = [{ kind: 'CO2_REDUCTION' }] as any;
    progressWheelService.getWheelsForUser.mockResolvedValue(wheels);

    const result = await service.submitSurvey('u1', answers);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { ...answers, segment: UserSegment.ADVANCED },
    });
    expect(
      gamificationOnboardingService.applyOnboardingSideEffects,
    ).toHaveBeenCalledWith(updatedUser, UserSegment.ADVANCED);
    expect(progressWheelService.getWheelsForUser).toHaveBeenCalledWith('u1');
    expect(result).toEqual({
      segment: UserSegment.ADVANCED,
      progressWheels: wheels,
    });
  });

  it('derives BEGINNER for low-sustainability answers', async () => {
    prisma.user.update.mockResolvedValue({ id: 'u2' });

    await service.submitSurvey('u2', {
      weeklyMeatConsumption: WeeklyMeatRange.FIFTEEN_PLUS,
      weeklyBeefConsumption: WeeklyBeefFrequency.THREE_PLUS_TIMES_PER_WEEK,
      weeklyFoodWaste: WeeklyFoodWasteRange.FIVE_PLUS,
      weeklyUpfConsumption: WeeklyUpfRange.FIFTEEN_PLUS,
      weeklyReusableOrRefill: WeeklyReusableRange.ZERO_TO_TWO,
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ segment: UserSegment.BEGINNER }),
      }),
    );
  });
});
