import { Test, TestingModule } from '@nestjs/testing';
import { ContentLevel } from '@prisma/client';
import { LearningService } from './learning.service';
import { LearningTranslationHelper } from './learning-translation.helper';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';
import { EventSource, EventType } from '../../events/event-types';
import { UserEventService } from '../../events/services/user-event.service';

describe('LearningService', () => {
  let service: LearningService;
  let userEventService: jest.Mocked<Pick<UserEventService, 'record'>>;
  let prisma: {
    dimension: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
    };
    foodFact: { findMany: jest.Mock; count: jest.Mock; findFirst: jest.Mock };
    quiz: { findFirst: jest.Mock; findMany: jest.Mock };
    quizProgress: {
      upsert: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    quest: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
    questProgress: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
    mission: { findMany: jest.Mock };
    challenge: { findMany: jest.Mock };
    microLearning: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const mockTranslations = {
    resolveLocale: jest.fn((lang?: string) => lang ?? DEFAULT_LOCALE),
    overlayFields: jest.fn(
      (
        _type: string,
        items: Array<{ id: string }>,
        _locale: string,
        fields: string[],
        fallbacks: (item: any) => Record<string, string | null | undefined>,
      ) =>
        Object.fromEntries(
          items.map((item) => {
            const fb = fallbacks(item);
            const mapped: Record<string, string | null> = {};
            for (const field of fields) {
              const v = fb[field];
              mapped[field] = v == null || v === '' ? null : String(v);
            }
            return [item.id, mapped];
          }),
        ),
    ),
  };

  beforeEach(async () => {
    prisma = {
      dimension: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      foodFact: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      quiz: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      quizProgress: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      quest: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      questProgress: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      mission: { findMany: jest.fn().mockResolvedValue([]) },
      challenge: { findMany: jest.fn().mockResolvedValue([]) },
      microLearning: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prisma) => Promise<unknown>)(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });

    userEventService = {
      record: jest.fn().mockResolvedValue({ event: {}, replayed: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningService,
        { provide: PrismaService, useValue: prisma },
        { provide: LearningTranslationHelper, useValue: mockTranslations },
        { provide: UserEventService, useValue: userEventService },
      ],
    }).compile();

    service = module.get(LearningService);
    jest.clearAllMocks();
    mockTranslations.resolveLocale.mockImplementation(
      (lang?: string) => lang ?? DEFAULT_LOCALE,
    );
  });

  it('lists dimensions with nested topics ordered by sortOrder', async () => {
    prisma.dimension.findMany.mockResolvedValue([
      {
        id: 'd1',
        code: 'B',
        name: 'Packaging',
        sortOrder: 1,
        topics: [
          {
            id: 't1',
            code: 'B1',
            name: 'Plastic',
            dimensionId: 'd1',
            sortOrder: 0,
          },
        ],
      },
    ]);

    const result = await service.listDimensions({});

    expect(prisma.dimension.findMany).toHaveBeenCalledWith({
      orderBy: { sortOrder: 'asc' },
      include: { topics: { orderBy: { sortOrder: 'asc' } } },
    });
    expect(result).toEqual([
      {
        id: 'd1',
        code: 'B',
        name: 'Packaging',
        sortOrder: 1,
        topics: [
          {
            id: 't1',
            code: 'B1',
            name: 'Plastic',
            dimensionId: 'd1',
            sortOrder: 0,
          },
        ],
      },
    ]);
  });

  it('lists food facts with available=true and pagination meta', async () => {
    const row = {
      id: 'ff1',
      code: 'FF.B1.1',
      topicId: 't1',
      body: 'Fact body',
      source: null,
      level: ContentLevel.BEGINNER,
      health: false,
      foodChoice: true,
      foodWaste: false,
      available: true,
    };
    prisma.foodFact.findMany.mockResolvedValue([row]);
    prisma.foodFact.count.mockResolvedValue(1);

    const result = await service.listFoodFacts({ page: 1, limit: 10 });

    expect(prisma.foodFact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ available: true }),
        skip: 0,
        take: 10,
      }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0].body).toBe('Fact body');
    expect(result.meta).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
  });

  it('upserts quiz progress and sets isCorrect from the selected option', async () => {
    prisma.quiz.findFirst.mockResolvedValue({
      id: 'q1',
      code: 'Q.B1.1',
      topicId: 't1',
      question: 'Which is best?',
      explanation: 'Because reuse',
      source: null,
      level: ContentLevel.BEGINNER,
      health: false,
      foodChoice: true,
      foodWaste: false,
      available: true,
      options: [
        {
          id: 'opt-a',
          label: 'A',
          text: 'Wrong',
          isCorrect: false,
          sortOrder: 0,
        },
        {
          id: 'opt-b',
          label: 'B',
          text: 'Right',
          isCorrect: true,
          sortOrder: 1,
        },
      ],
    });
    prisma.quizProgress.upsert.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      quizId: 'q1',
      selectedOptionId: 'opt-b',
      isCorrect: true,
      completed: true,
      answeredAt: new Date('2026-08-04T12:00:00.000Z'),
    });

    const result = await service.upsertQuizProgress('u1', 'Q.B1.1', {
      selectedLabel: 'B',
    });

    expect(prisma.quizProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_quizId: { userId: 'u1', quizId: 'q1' } },
        create: expect.objectContaining({
          selectedOptionId: 'opt-b',
          isCorrect: true,
          completed: true,
        }),
        update: expect.objectContaining({
          selectedOptionId: 'opt-b',
          isCorrect: true,
          completed: true,
        }),
      }),
    );
    expect(result.isCorrect).toBe(true);
    expect(result.completed).toBe(true);
    expect(result.quizCode).toBe('Q.B1.1');
    expect(result.question).toBe('Which is best?');
  });

  it('returns default quiz progress with translated question when no row exists', async () => {
    prisma.quiz.findFirst.mockResolvedValue({
      id: 'q1',
      code: 'Q.B1.1',
      topicId: 't1',
      question: 'Which is best?',
      explanation: 'Because reuse',
      source: null,
      level: ContentLevel.BEGINNER,
      health: false,
      foodChoice: true,
      foodWaste: false,
      available: true,
      options: [],
    });
    prisma.quizProgress.findUnique.mockResolvedValue(null);

    const result = await service.getQuizProgress('u1', 'Q.B1.1');

    expect(result).toMatchObject({
      userId: 'u1',
      quizId: 'q1',
      quizCode: 'Q.B1.1',
      question: 'Which is best?',
      completed: false,
    });
    expect(result.id).toBeUndefined();
  });

  it('creates a quest with nested items after validating content codes', async () => {
    prisma.dimension.findUnique.mockResolvedValue({ id: 'dim-1' });
    prisma.mission.findMany.mockResolvedValue([{ code: 'M.A1.1' }]);
    prisma.challenge.findMany.mockResolvedValue([{ code: 'CH.A1.1' }]);
    prisma.quest.create.mockResolvedValue({
      id: 'quest-1',
      code: 'QUEST.CUSTOM',
      dimensionId: 'dim-1',
      level: ContentLevel.BEGINNER,
      name: 'Custom name',
      title: 'Custom quest',
      description: 'Desc',
      available: true,
      items: [
        {
          id: 'item-1',
          contentType: 'MISSION',
          contentCode: 'M.A1.1',
          sortOrder: 0,
        },
        {
          id: 'item-2',
          contentType: 'CHALLENGE',
          contentCode: 'CH.A1.1',
          sortOrder: 1,
        },
      ],
    });

    const result = await service.createQuest({
      code: 'QUEST.CUSTOM',
      dimensionId: 'dim-1',
      level: ContentLevel.BEGINNER,
      name: 'Custom name',
      title: 'Custom quest',
      description: 'Desc',
      available: true,
      items: [
        {
          contentType: 'MISSION' as const,
          contentCode: 'M.A1.1',
          sortOrder: 0,
        },
        {
          contentType: 'CHALLENGE' as const,
          contentCode: 'CH.A1.1',
          sortOrder: 1,
        },
      ],
    });

    expect(prisma.quest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'QUEST.CUSTOM',
          dimensionId: 'dim-1',
          name: 'Custom name',
          items: {
            create: [
              {
                contentType: 'MISSION',
                contentCode: 'M.A1.1',
                sortOrder: 0,
              },
              {
                contentType: 'CHALLENGE',
                contentCode: 'CH.A1.1',
                sortOrder: 1,
              },
            ],
          },
        }),
      }),
    );
    expect(result.code).toBe('QUEST.CUSTOM');
    expect(result.name).toBe('Custom name');
    expect(result.items).toHaveLength(2);
  });

  it('rejects create quest when item content codes are unknown', async () => {
    prisma.dimension.findUnique.mockResolvedValue({ id: 'dim-1' });
    prisma.mission.findMany.mockResolvedValue([]);

    await expect(
      service.createQuest({
        code: 'QUEST.BAD',
        dimensionId: 'dim-1',
        level: ContentLevel.BEGINNER,
        items: [
          {
            contentType: 'MISSION' as const,
            contentCode: 'M.MISSING',
          },
        ],
      }),
    ).rejects.toThrow('Unknown quest item content codes');
    expect(prisma.quest.create).not.toHaveBeenCalled();
  });

  describe('upsertQuestProgress events', () => {
    const quest = {
      id: 'quest-1',
      code: 'QUEST.DIET.1',
      title: 'Diet quest',
      name: 'Diet',
      description: null,
    };

    beforeEach(() => {
      prisma.quest.findFirst.mockResolvedValue(quest);
    });

    it('emits QUEST_STARTED on first active progress', async () => {
      prisma.questProgress.findUnique.mockResolvedValue(null);
      prisma.questProgress.upsert.mockResolvedValue({
        userId: 'u1',
        questId: quest.id,
        completed: false,
        progress: 10,
        unlockedAt: new Date(),
      });

      await service.upsertQuestProgress('u1', quest.code, { progress: 10 });

      expect(userEventService.record).toHaveBeenCalledTimes(1);
      expect(userEventService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          eventType: EventType.QUEST_STARTED,
          source: EventSource.QUEST,
          metadata: {
            questId: quest.id,
            questCode: quest.code,
            source: EventSource.API,
            body: { progress: 10 },
          },
          idempotencyKey: 'quest-started:u1:quest-1',
        }),
        prisma,
      );
    });

    it('emits STARTED and COMPLETED when first write is completed', async () => {
      prisma.questProgress.findUnique.mockResolvedValue(null);
      prisma.questProgress.upsert.mockResolvedValue({
        userId: 'u1',
        questId: quest.id,
        completed: true,
        progress: 100,
        unlockedAt: new Date(),
      });

      await service.upsertQuestProgress('u1', quest.code, {
        completed: true,
        progress: 100,
      });

      expect(userEventService.record).toHaveBeenCalledTimes(2);
      expect(userEventService.record.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          eventType: EventType.QUEST_STARTED,
          idempotencyKey: 'quest-started:u1:quest-1',
          metadata: {
            questId: quest.id,
            questCode: quest.code,
            source: EventSource.API,
            body: { progress: 100, completed: true },
          },
        }),
      );
      expect(userEventService.record.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          eventType: EventType.QUEST_COMPLETED,
          source: EventSource.QUEST,
          idempotencyKey: 'quest-completed:u1:quest-1',
          metadata: {
            questId: quest.id,
            questCode: quest.code,
            source: EventSource.API,
            body: { progress: 100, completed: true },
          },
        }),
      );
    });

    it('does not emit on a zero-progress create', async () => {
      prisma.questProgress.findUnique.mockResolvedValue(null);
      prisma.questProgress.upsert.mockResolvedValue({
        userId: 'u1',
        questId: quest.id,
        completed: false,
        progress: 0,
        unlockedAt: new Date(),
      });

      await service.upsertQuestProgress('u1', quest.code, { progress: 0 });

      expect(userEventService.record).not.toHaveBeenCalled();
    });

    it('emits QUEST_UPDATED when progress changes after start', async () => {
      prisma.questProgress.findUnique.mockResolvedValue({
        userId: 'u1',
        questId: quest.id,
        completed: false,
        progress: 10,
      });
      prisma.questProgress.upsert.mockResolvedValue({
        userId: 'u1',
        questId: quest.id,
        completed: false,
        progress: 40,
        unlockedAt: new Date(),
      });

      await service.upsertQuestProgress('u1', quest.code, { progress: 40 });

      expect(userEventService.record).toHaveBeenCalledTimes(1);
      expect(userEventService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: EventType.QUEST_UPDATED,
          source: EventSource.QUEST,
          metadata: {
            questId: quest.id,
            questCode: quest.code,
            source: EventSource.API,
            body: { progress: 40 },
          },
          idempotencyKey: 'quest-updated:u1:quest-1:40:false',
        }),
        prisma,
      );
    });

    it('emits UPDATED and COMPLETED when completing an in-progress quest', async () => {
      prisma.questProgress.findUnique.mockResolvedValue({
        userId: 'u1',
        questId: quest.id,
        completed: false,
        progress: 40,
      });
      prisma.questProgress.upsert.mockResolvedValue({
        userId: 'u1',
        questId: quest.id,
        completed: true,
        progress: 100,
        unlockedAt: new Date(),
      });

      await service.upsertQuestProgress('u1', quest.code, {
        completed: true,
        progress: 100,
      });

      expect(userEventService.record).toHaveBeenCalledTimes(2);
      expect(userEventService.record.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          eventType: EventType.QUEST_UPDATED,
          idempotencyKey: 'quest-updated:u1:quest-1:100:true',
        }),
      );
      expect(userEventService.record.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          eventType: EventType.QUEST_COMPLETED,
          idempotencyKey: 'quest-completed:u1:quest-1',
        }),
      );
    });

    it('does not re-emit on a completed retry', async () => {
      prisma.questProgress.findUnique.mockResolvedValue({
        userId: 'u1',
        questId: quest.id,
        completed: true,
        progress: 100,
      });
      prisma.questProgress.upsert.mockResolvedValue({
        userId: 'u1',
        questId: quest.id,
        completed: true,
        progress: 100,
        unlockedAt: new Date(),
      });

      await service.upsertQuestProgress('u1', quest.code, {
        completed: true,
        progress: 100,
      });

      expect(userEventService.record).not.toHaveBeenCalled();
    });
  });
});
