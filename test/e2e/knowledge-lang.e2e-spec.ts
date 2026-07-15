import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { I18nJsonLoader, I18nModule, QueryResolver } from 'nestjs-i18n';
import { join } from 'path';
import request from 'supertest';
import { DataBaseAuthGuard } from '../../src/common/guards/database-auth.guards';
import { DEFAULT_LOCALE } from '../../src/i18n/constants';
import { I18nSupportModule } from '../../src/i18n/i18n-support.module';
import { KnowledgeController } from '../../src/knowledge/controllers/knowledge.controller';
import { KnowledgeProgressRepository } from '../../src/knowledge/repositories/knowledge-progress.repository';
import { KnowledgeRepository } from '../../src/knowledge/repositories/knowledge.repository';
import { KnowledgeProgressService } from '../../src/knowledge/services/knowledge-progress.service';
import { KnowledgeService } from '../../src/knowledge/services/knowledge.service';
import {
  createAuthGuardMock,
  DEFAULT_CATALOG_AUTH_USER,
} from './helpers/controller-e2e-helpers';

describe('Knowledge lang query (e2e)', () => {
  let app: INestApplication;

  const authUser = DEFAULT_CATALOG_AUTH_USER;
  const knowledgeId = '00000000-0000-0000-0000-000000000010';

  const nutritionBasicsKnowledge = {
    id: knowledgeId,
    slug: 'nutrition-basics',
    userId: authUser.id,
    title: 'Nutrition Basics',
    description: 'A short quiz about basic nutrition facts and macros.',
    available: true,
    content: {
      questions: [
        {
          question: 'Which macronutrient is the primary source of energy?',
          options: ['Vitamins', 'Carbohydrates', 'Water', 'Minerals'],
          correctAnswer: 'Carbohydrates',
        },
        {
          question: 'Which vitamin is fat-soluble?',
          options: ['Vitamin C', 'Vitamin B12', 'Vitamin A', 'Vitamin B6'],
          correctAnswer: 'Vitamin A',
        },
      ],
    },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const knowledgeRepositoryMock = {
    findWithPagination: jest.fn().mockResolvedValue({
      data: [nutritionBasicsKnowledge],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
    findById: jest.fn().mockResolvedValue(nutritionBasicsKnowledge),
  };

  const knowledgeProgressRepositoryMock = {
    findManyByKnowledgeIds: jest.fn().mockResolvedValue([]),
    findByUserAndKnowledge: jest.fn().mockResolvedValue(null),
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
      controllers: [KnowledgeController],
      providers: [
        KnowledgeService,
        KnowledgeProgressService,
        { provide: KnowledgeRepository, useValue: knowledgeRepositoryMock },
        {
          provide: KnowledgeProgressRepository,
          useValue: knowledgeProgressRepositoryMock,
        },
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

  it('GET /knowledge returns German copy when lang=de', async () => {
    const res = await request(app.getHttpServer())
      .get('/knowledge?lang=de')
      .expect(200);

    expect(res.body.data[0].title).toBe('Ernährungsgrundlagen');
    expect(res.body.data[0].content.questions[0].question).toBe(
      'Welcher Makronährstoff ist die primäre Energiequelle?',
    );
    expect(res.body.data[0].content.questions[0].correctAnswer).toBe(
      'Kohlenhydrate',
    );
  });

  it('GET /knowledge returns English copy without lang', async () => {
    const res = await request(app.getHttpServer()).get('/knowledge').expect(200);

    expect(res.body.data[0].title).toBe('Nutrition Basics');
    expect(res.body.data[0].content.questions[0].question).toBe(
      'Which macronutrient is the primary source of energy?',
    );
  });

  it('GET /knowledge/:id localizes full quiz when lang=de', async () => {
    const res = await request(app.getHttpServer())
      .get(`/knowledge/${knowledgeId}?lang=de`)
      .expect(200);

    expect(res.body.title).toBe('Ernährungsgrundlagen');
    expect(res.body.content.questions[1].question).toBe(
      'Welches Vitamin ist fettlöslich?',
    );
    expect(res.body.content.questions[1].correctAnswer).toBe('Vitamin A');
  });

  it('GET /knowledge rejects unsupported lang values', async () => {
    await request(app.getHttpServer()).get('/knowledge?lang=xx').expect(400);
  });
});
