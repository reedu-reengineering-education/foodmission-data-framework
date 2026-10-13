import { readFileSync } from 'fs';
import { join } from 'path';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import {
  DailyFruitVegServings,
  HabitFrequency,
  LabelFamiliarity,
  UserSegment,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyLegumeFrequency,
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
  let prisma: { user: { update: jest.Mock }; $transaction: jest.Mock };
  let gamificationOnboardingService: jest.Mocked<
    Pick<GamificationOnboardingService, 'applyOnboardingSideEffects'>
  >;
  let progressWheelService: jest.Mocked<
    Pick<ProgressWheelService, 'getWheelsForUser'>
  >;
  let i18n: { translate: jest.Mock };

  // Best answer on every question -> ADVANCED in every dimension.
  const answers = {
    weeklyMeatConsumption: WeeklyMeatRange.ZERO_TO_FOUR,
    weeklyBeefConsumption: WeeklyBeefFrequency.NEVER,
    weeklyLegumeConsumption: WeeklyLegumeFrequency.DAILY,
    checksCountryOfOrigin: HabitFrequency.ALWAYS,
    choosesSeasonalProduce: HabitFrequency.ALWAYS,
    considersSustainabilityInfo: HabitFrequency.ALWAYS,
    readsIngredientLists: HabitFrequency.ALWAYS,
    sustainabilityLabelFamiliarity: LabelFamiliarity.VERY_FAMILIAR,
    productionMethodsInfluence: HabitFrequency.ALWAYS,
    weeklyReusableOrRefill: WeeklyReusableRange.TEN_PLUS,
    checksPackagingDisposal: HabitFrequency.ALWAYS,
    weeklyFoodWaste: WeeklyFoodWasteRange.ZERO,
    plansMealsBeforeShopping: HabitFrequency.ALWAYS,
    usesLeftovers: HabitFrequency.ALWAYS,
    weeklyUpfConsumption: WeeklyUpfRange.ZERO_TO_THREE,
    wholeGrainFrequency: HabitFrequency.ALWAYS,
    dailyFruitVegServings: DailyFruitVegServings.FIVE_PLUS,
  };

  beforeEach(async () => {
    prisma = {
      user: { update: jest.fn() },
      $transaction: jest.fn(),
    };
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
    i18n = { translate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingSurveyService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: GamificationOnboardingService,
          useValue: gamificationOnboardingService,
        },
        { provide: ProgressWheelService, useValue: progressWheelService },
        { provide: I18nService, useValue: i18n },
      ],
    }).compile();

    service = module.get(OnboardingSurveyService);
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );
  });

  it('returns the static survey questions', () => {
    expect(service.getSurveyQuestions()).toBe(ONBOARDING_SURVEY_QUESTIONS);
    expect(service.getSurveyQuestions('en')).toBe(ONBOARDING_SURVEY_QUESTIONS);
    expect(service.getSurveyQuestions('xx')).toBe(ONBOARDING_SURVEY_QUESTIONS);
    expect(i18n.translate).not.toHaveBeenCalled();
  });

  it('translates question texts and option labels for a supported locale', () => {
    i18n.translate.mockImplementation((key: string) => `de:${key}`);

    const questions = service.getSurveyQuestions('DE');

    expect(questions).toHaveLength(ONBOARDING_SURVEY_QUESTIONS.length);
    expect(questions[0]).toEqual({
      field: 'weeklyMeatConsumption',
      text: 'de:onboarding-survey.questions.weeklyMeatConsumption.text',
      options: ONBOARDING_SURVEY_QUESTIONS[0].options.map((option) => ({
        value: option.value,
        label: `de:onboarding-survey.questions.weeklyMeatConsumption.options.${option.value}`,
      })),
    });
    expect(i18n.translate).toHaveBeenCalledWith(
      'onboarding-survey.questions.weeklyMeatConsumption.text',
      { lang: 'de', defaultValue: ONBOARDING_SURVEY_QUESTIONS[0].text },
    );
  });

  it('falls back to English when a translation is not a string', () => {
    i18n.translate.mockReturnValue(undefined);

    expect(service.getSurveyQuestions('de')).toEqual(
      ONBOARDING_SURVEY_QUESTIONS,
    );
  });

  it('serves English when no I18nModule is registered', () => {
    const withoutI18n = new OnboardingSurveyService(
      prisma as unknown as PrismaService,
      gamificationOnboardingService as unknown as GamificationOnboardingService,
      progressWheelService as unknown as ProgressWheelService,
    );

    expect(withoutI18n.getSurveyQuestions('de')).toBe(
      ONBOARDING_SURVEY_QUESTIONS,
    );
  });

  it('keeps src/i18n/en/onboarding-survey.json in sync with the survey config', () => {
    const fromConfig = Object.fromEntries(
      ONBOARDING_SURVEY_QUESTIONS.map((question) => [
        question.field,
        {
          text: question.text,
          options: Object.fromEntries(
            question.options.map((option) => [option.value, option.label]),
          ),
        },
      ]),
    );

    const enOnboardingSurvey = JSON.parse(
      readFileSync(
        join(__dirname, '../../i18n/en/onboarding-survey.json'),
        'utf8',
      ),
    );
    expect(enOnboardingSurvey.questions).toEqual(fromConfig);
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
    ).toHaveBeenCalledWith(updatedUser, UserSegment.ADVANCED, prisma);
    expect(progressWheelService.getWheelsForUser).toHaveBeenCalledWith('u1');
    expect(result).toEqual({
      segment: UserSegment.ADVANCED,
      progressWheels: wheels,
    });
  });

  it('rejects repeat submissions without returning wheels', async () => {
    prisma.user.update.mockResolvedValue({ id: 'u1' });
    gamificationOnboardingService.applyOnboardingSideEffects.mockResolvedValue({
      segment: UserSegment.ADVANCED,
      walletEnsured: false,
      onboardingEventRecorded: false,
      skipped: true,
    });

    await expect(service.submitSurvey('u1', answers)).rejects.toThrow(
      ConflictException,
    );
    expect(progressWheelService.getWheelsForUser).not.toHaveBeenCalled();
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
