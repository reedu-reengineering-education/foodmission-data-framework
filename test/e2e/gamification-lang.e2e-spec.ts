import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeScope, ProgressTrackingType } from '@prisma/client';
import { I18nJsonLoader, I18nModule, QueryResolver } from 'nestjs-i18n';
import { join } from 'path';
import request from 'supertest';
import { ChallengesController } from '../../src/challenges/controllers/challenges.controller';
import { ChallengeProgressController } from '../../src/challenges/controllers/challenge-progress.controller';
import { ChallengesRepository } from '../../src/challenges/repositories/challenges.repository';
import { ChallengeProgressRepository } from '../../src/challenges/repositories/challenge-progress.repository';
import { ChallengesService } from '../../src/challenges/services/challenges.service';
import { ChallengeProgressService } from '../../src/challenges/services/challenge-progress.service';
import { DataBaseAuthGuard } from '../../src/common/guards/database-auth.guards';
import { PrismaService } from '../../src/database/prisma.service';
import { DEFAULT_LOCALE } from '../../src/i18n/constants';
import { I18nSupportModule } from '../../src/i18n/i18n-support.module';
import { MissionsController } from '../../src/missions/controllers/missions.controller';
import { MissionProgressController } from '../../src/missions/controllers/mission-progress.controller';
import { MissionsRepository } from '../../src/missions/repositories/missions.repository';
import { MissionProgressRepository } from '../../src/missions/repositories/mission-progress.repository';
import { MissionsService } from '../../src/missions/services/missions.service';
import { MissionProgressService } from '../../src/missions/services/mission-progress.service';
import { QuestsController } from '../../src/quests/controllers/quests.controller';
import { QuestProgressController } from '../../src/quests/controllers/quest-progress.controller';
import { QuestsRepository } from '../../src/quests/repositories/quests.repository';
import { QuestProgressRepository } from '../../src/quests/repositories/quest-progress.repository';
import { QuestsService } from '../../src/quests/services/quests.service';
import { QuestProgressService } from '../../src/quests/services/quest-progress.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ValidationPipe } from '@nestjs/common';
import {
  createAuthGuardMock,
  DEFAULT_CATALOG_AUTH_USER,
} from './helpers/controller-e2e-helpers';

describe('Gamification lang query (e2e)', () => {
  let app: INestApplication;

  const authUser = DEFAULT_CATALOG_AUTH_USER;

  const missionId = '00000000-0000-0000-0000-000000000001';
  const questId = '00000000-0000-0000-0000-000000000002';
  const challengeId = '00000000-0000-0000-0000-000000000003';
  const nestedChallengeId = '00000000-0000-0000-0000-000000000004';

  const plasticFreeMonthMission = {
    id: missionId,
    slug: 'plastic-free-month',
    title: 'Plastic-Free Month',
    description: 'Eliminate single-use plastics from your life for 30 days',
    available: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-31'),
    missionProgresses: [],
  };

  const avoidSingleUsePlasticQuest = {
    id: questId,
    slug: 'avoid-single-use-plastic',
    missionId,
    title: 'Avoid single-use plastic',
    description: 'Skip disposable plastic items in your daily routine',
    topicSlug: 'plastic-waste',
    sortOrder: 0,
    available: true,
    streakEnabled: true,
    progressTrackingType: ProgressTrackingType.SOFT,
    challenges: [
      {
        id: nestedChallengeId,
        slug: 'refuse-plastic-bottle',
        title: 'Refuse a plastic bottle',
        description: 'Decline a single-use plastic bottle today',
        available: true,
        challengeScope: ChallengeScope.QUEST_ONE_TIME,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    ],
  };

  const bringYourOwnBagChallenge = {
    id: challengeId,
    slug: 'bring-your-own-bag',
    title: 'Bring Your Own Bag',
    description: 'Use a reusable shopping bag for your groceries today',
    available: true,
    challengeScope: ChallengeScope.DAILY_STANDALONE,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    questId: null,
    challengeProgresses: [],
  };

  const missionsRepositoryMock = {
    findAll: jest.fn().mockResolvedValue([plasticFreeMonthMission]),
    findById: jest.fn().mockResolvedValue({
      ...plasticFreeMonthMission,
      quests: [avoidSingleUsePlasticQuest],
    }),
  };

  const missionProgressRepositoryMock = {
    findAllByUserId: jest.fn().mockResolvedValue([
      {
        missionId,
        userId: authUser.id,
        completed: false,
        progress: 50,
        mission: {
          slug: plasticFreeMonthMission.slug,
          title: plasticFreeMonthMission.title,
          description: plasticFreeMonthMission.description,
        },
      },
    ]),
    findByUserIdAndMissionId: jest.fn(),
    update: jest.fn(),
  };

  const questsRepositoryMock = {
    findAll: jest.fn().mockResolvedValue([avoidSingleUsePlasticQuest]),
    findById: jest.fn().mockResolvedValue(avoidSingleUsePlasticQuest),
    findByMissionId: jest.fn().mockResolvedValue([avoidSingleUsePlasticQuest]),
  };

  const questProgressRepositoryMock = {
    findAllByUserId: jest.fn().mockResolvedValue([
      {
        questId,
        userId: authUser.id,
        completed: false,
        progress: 57,
        currentStreak: 1,
        longestStreak: 4,
        quest: {
          slug: avoidSingleUsePlasticQuest.slug,
          title: avoidSingleUsePlasticQuest.title,
          description: avoidSingleUsePlasticQuest.description,
        },
      },
    ]),
    findByUserIdAndQuestId: jest.fn(),
    update: jest.fn(),
  };

  const challengesRepositoryMock = {
    findDailyStandalone: jest.fn().mockResolvedValue([bringYourOwnBagChallenge]),
    findById: jest.fn().mockResolvedValue(bringYourOwnBagChallenge),
  };

  const challengeProgressRepositoryMock = {
    findAllByUserId: jest.fn().mockResolvedValue([
      {
        challengeId,
        userId: authUser.id,
        completed: false,
        progress: 0,
        status: 'ACTIVE',
        challenge: {
          slug: bringYourOwnBagChallenge.slug,
          title: bringYourOwnBagChallenge.title,
          description: bringYourOwnBagChallenge.description,
        },
      },
    ]),
    findByUserIdAndChallengeId: jest.fn(),
    update: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        I18nModule.forRoot({
          fallbackLanguage: DEFAULT_LOCALE,
          loader: I18nJsonLoader,
          loaderOptions: {
            path: join(__dirname, '../../src/i18n/'),
          },
          resolvers: [
            {
              use: QueryResolver,
              options: ['lang'],
            },
          ],
        }),
        I18nSupportModule,
      ],
      controllers: [
        MissionsController,
        MissionProgressController,
        QuestsController,
        QuestProgressController,
        ChallengesController,
        ChallengeProgressController,
      ],
      providers: [
        MissionsService,
        MissionProgressService,
        QuestsService,
        QuestProgressService,
        ChallengesService,
        ChallengeProgressService,
        { provide: MissionsRepository, useValue: missionsRepositoryMock },
        {
          provide: MissionProgressRepository,
          useValue: missionProgressRepositoryMock,
        },
        { provide: QuestsRepository, useValue: questsRepositoryMock },
        { provide: QuestProgressRepository, useValue: questProgressRepositoryMock },
        { provide: ChallengesRepository, useValue: challengesRepositoryMock },
        {
          provide: ChallengeProgressRepository,
          useValue: challengeProgressRepositoryMock,
        },
        { provide: PrismaService, useValue: {} },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DataBaseAuthGuard)
      .useValue(createAuthGuardMock(authUser))
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('missions', () => {
    it('GET /missions returns German copy when lang=de', async () => {
      const res = await request(app.getHttpServer())
        .get('/missions?lang=de')
        .expect(200);

      expect(res.body[0].title).toBe('Plastikfreier Monat');
    });

    it('GET /missions returns English copy without lang', async () => {
      const res = await request(app.getHttpServer()).get('/missions').expect(200);

      expect(res.body[0].title).toBe('Plastic-Free Month');
    });

    it('GET /missions/progress returns localized missionTitle when lang=de', async () => {
      const res = await request(app.getHttpServer())
        .get('/missions/progress?lang=de')
        .expect(200);

      expect(res.body[0].missionTitle).toBe('Plastikfreier Monat');
    });

    it('GET /missions rejects unsupported lang values', async () => {
      await request(app.getHttpServer()).get('/missions?lang=xx').expect(400);
    });
  });

  describe('quests', () => {
    it('GET /quests returns German copy when lang=de', async () => {
      const res = await request(app.getHttpServer())
        .get('/quests?lang=de')
        .expect(200);

      expect(res.body[0].title).toBe('Einwegplastik vermeiden');
    });

    it('GET /quests/:id localizes nested challenges when lang=de', async () => {
      const res = await request(app.getHttpServer())
        .get(`/quests/${questId}?lang=de`)
        .expect(200);

      expect(res.body.challenges[0].title).toBe('Plastikflasche ablehnen');
    });

    it('GET /quests/progress returns localized questTitle when lang=de', async () => {
      const res = await request(app.getHttpServer())
        .get('/quests/progress?lang=de')
        .expect(200);

      expect(res.body[0].questTitle).toBe('Einwegplastik vermeiden');
    });
  });

  describe('challenges', () => {
    it('GET /challenges falls back to English when German copy is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/challenges?lang=de')
        .expect(200);

      expect(res.body[0].title).toBe('Bring Your Own Bag');
    });

    it('GET /challenges returns English copy without lang', async () => {
      const res = await request(app.getHttpServer()).get('/challenges').expect(200);

      expect(res.body[0].title).toBe('Bring Your Own Bag');
    });

    it('GET /challenges/progress falls back to English challengeTitle when lang=de', async () => {
      const res = await request(app.getHttpServer())
        .get('/challenges/progress?lang=de')
        .expect(200);

      expect(res.body[0].challengeTitle).toBe('Bring Your Own Bag');
    });
  });
});
