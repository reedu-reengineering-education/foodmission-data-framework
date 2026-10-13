import { ContentLevel, ProgressStatus, QuestContentType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TranslationService } from '../../translations/services/translation.service';
import { DimensionLevelService } from './dimension-level.service';
import { LearningProgressService } from './learning-progress.service';

const flags = (health: boolean, foodChoice: boolean, foodWaste: boolean) => ({
  health,
  foodChoice,
  foodWaste,
});

/** German translations; anything not listed has none. */
const GERMAN: Record<string, Record<string, Record<string, string>>> = {
  Mission: { m1: { title: 'Mahlzeit loggen' } },
  Quest: { q1: { name: 'Essen loggen' } },
  Dimension: { 'd-diet': { name: 'Ernährung' } },
};

function mockTranslationService() {
  return {
    resolveLocale: jest.fn((lang?: string) => lang ?? 'en'),
    resolveMany: jest.fn(
      (entityType: string, ids: string[], _locale: string, fields: string[]) =>
        Promise.resolve(
          Object.fromEntries(
            ids.map((id) => [
              id,
              Object.fromEntries(
                fields.map((f) => [f, GERMAN[entityType]?.[id]?.[f] ?? null]),
              ),
            ]),
          ),
        ),
    ),
  };
}

function build() {
  const prisma = {
    quest: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'q1',
          code: 'QUEST.DIET_CHANGES.BEGINNER.1',
          dimensionId: 'd-diet',
          name: 'Log food',
          description: null,
          items: [
            { contentType: QuestContentType.MISSION, contentCode: 'M.1' },
            { contentType: QuestContentType.QUIZ, contentCode: 'Q.1' },
            {
              contentType: QuestContentType.MICRO_LEARNING,
              contentCode: 'ML.1',
            },
          ],
        },
        {
          id: 'q2',
          code: 'QUEST.FOOD_WASTE.INTERMEDIATE.1',
          dimensionId: 'd-waste',
          name: 'Save leftovers',
          description: null,
          items: [
            // Shared with q1: must count once in the bars.
            { contentType: QuestContentType.MISSION, contentCode: 'M.1' },
            { contentType: QuestContentType.FOOD_FACT, contentCode: 'FF.1' },
          ],
        },
      ]),
    },
    questProgress: { findMany: jest.fn().mockResolvedValue([]) },
    missionProgress: {
      findMany: jest.fn().mockResolvedValue([{ mission: { code: 'M.1' } }]),
    },
    challengeProgress: { findMany: jest.fn().mockResolvedValue([]) },
    quizProgress: { findMany: jest.fn().mockResolvedValue([]) },
    foodFactProgress: { findMany: jest.fn().mockResolvedValue([]) },
    mission: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'm1',
          code: 'M.1',
          title: 'Log a meal',
          ...flags(true, true, false),
        },
      ]),
    },
    challenge: { findMany: jest.fn().mockResolvedValue([]) },
    quiz: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'qz1',
          code: 'Q.1',
          title: 'Why?',
          ...flags(true, false, false),
        },
      ]),
    },
    foodFact: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'ff1',
          code: 'FF.1',
          title: 'Fact',
          ...flags(false, false, true),
        },
      ]),
    },
    microLearning: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const dimensionLevelService = {
    listForUser: jest.fn().mockResolvedValue([
      {
        dimensionId: 'd-diet',
        dimensionCode: 'DIET_CHANGES',
        dimensionName: 'Diet',
        level: ContentLevel.BEGINNER,
      },
      {
        dimensionId: 'd-waste',
        dimensionCode: 'FOOD_WASTE',
        dimensionName: 'Waste',
        level: ContentLevel.INTERMEDIATE,
      },
    ]),
  };
  const translationService = mockTranslationService();
  const service = new LearningProgressService(
    prisma as unknown as PrismaService,
    dimensionLevelService as unknown as DimensionLevelService,
    translationService as unknown as TranslationService,
  );
  return { service, prisma, translationService };
}

describe('LearningProgressService', () => {
  it('scores the knowledge bars over unique trackable items', async () => {
    const { service } = build();

    const bars = await service.listKnowledge('u1');

    expect(bars).toEqual([
      // M.1 (done) + Q.1 (open)
      { kind: 'HEALTH', finishedItems: 1, totalItems: 2, percentComplete: 50 },
      // M.1 only, counted once despite two quests
      {
        kind: 'FOOD_CHOICES',
        finishedItems: 1,
        totalItems: 1,
        percentComplete: 100,
      },
      // FF.1 (open)
      {
        kind: 'FOOD_WASTE',
        finishedItems: 0,
        totalItems: 1,
        percentComplete: 0,
      },
    ]);
  });

  it('lists finished and open items for one bar', async () => {
    const { service } = build();

    const bar = await service.getKnowledge('u1', 'HEALTH');

    expect(bar.items).toEqual([
      {
        contentType: QuestContentType.MISSION,
        contentCode: 'M.1',
        title: 'Log a meal',
        finished: true,
      },
      {
        contentType: QuestContentType.QUIZ,
        contentCode: 'Q.1',
        title: 'Why?',
        finished: false,
      },
    ]);
  });

  it('localizes item titles, keeping English where no translation exists', async () => {
    const { service, translationService } = build();

    const bar = await service.getKnowledge('u1', 'HEALTH', 'de');

    expect(bar.items?.map((i) => i.title)).toEqual(['Mahlzeit loggen', 'Why?']);
    expect(translationService.resolveMany).toHaveBeenCalledWith(
      'Quiz',
      ['qz1'],
      'de',
      ['title'],
      {},
    );
  });

  it('reads quiz and food fact titles, not the question or body', async () => {
    const { service, prisma } = build();

    await service.getKnowledge('u1', 'HEALTH');

    for (const model of [prisma.quiz, prisma.foodFact]) {
      expect(model.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({ title: true }),
        }),
      );
    }
  });

  it('skips translation lookups for English', async () => {
    const { service, translationService } = build();

    await service.getKnowledge('u1', 'HEALTH');

    expect(translationService.resolveMany).not.toHaveBeenCalled();
  });

  it('counts every available quest for the bars, not just current levels', async () => {
    const { service, prisma } = build();

    await service.listKnowledge('u1');

    expect(prisma.quest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { available: true } }),
    );
  });

  it('only loads quests at the user level of each dimension', async () => {
    const { service, prisma } = build();

    await service.listDimensions('u1');

    expect(prisma.quest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          available: true,
          OR: [
            { dimensionId: 'd-diet', level: ContentLevel.BEGINNER },
            { dimensionId: 'd-waste', level: ContentLevel.INTERMEDIATE },
          ],
        },
      }),
    );
  });

  it('groups quests by dimension, excluding micro-learnings from progress', async () => {
    const { service } = build();

    const [diet, waste] = await service.listDimensions('u1');

    expect(diet).toMatchObject({
      dimensionCode: 'DIET_CHANGES',
      level: ContentLevel.BEGINNER,
      quests: [
        {
          questId: 'q1',
          finishedItems: 1,
          totalItems: 2,
          progress: 50,
          completed: false,
        },
      ],
    });
    expect(diet.quests[0].items).toBeUndefined();
    expect(waste.quests.map((q) => q.questId)).toEqual(['q2']);
  });

  it('keeps a rewarded quest complete even if an item later flips', async () => {
    const { service, prisma } = build();
    prisma.questProgress.findMany.mockResolvedValue([{ questId: 'q1' }]);

    const diet = await service.getDimension('u1', 'DIET_CHANGES');

    expect(diet.quests[0]).toMatchObject({ completed: true, progress: 100 });
    expect(diet.quests[0].items).toHaveLength(2);
  });

  it('localizes dimension names, quests and item titles', async () => {
    const { service } = build();

    const diet = await service.getDimension('u1', 'DIET_CHANGES', 'de');

    expect(diet).toMatchObject({
      dimensionName: 'Ernährung',
      quests: [
        {
          name: 'Essen loggen',
          description: null,
          items: [{ title: 'Mahlzeit loggen' }, { title: 'Why?' }],
        },
      ],
    });
  });

  it('localizes the dimension list without looking up item titles', async () => {
    const { service, translationService } = build();

    const [diet, waste] = await service.listDimensions('u1', 'de');

    expect(diet.dimensionName).toBe('Ernährung');
    expect(diet.quests[0].name).toBe('Essen loggen');
    expect(waste).toMatchObject({
      dimensionName: 'Waste',
      quests: [{ name: 'Save leftovers' }],
    });
    expect(
      translationService.resolveMany.mock.calls.map(([type]) => type).sort(),
    ).toEqual(['Dimension', 'Quest']);
  });

  it('404s for a dimension the user has no level in', async () => {
    const { service } = build();

    await expect(service.getDimension('u1', 'NOPE')).rejects.toThrow(
      'No level for dimension NOPE',
    );
  });
});

describe('LearningProgressService.getCurrentQuest', () => {
  function buildCurrent(currentQuest: unknown) {
    const prisma = {
      // Cloned because localizing mutates the quest in place.
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ currentQuest: structuredClone(currentQuest) }),
      },
      questProgress: { findUnique: jest.fn().mockResolvedValue(null) },
      missionProgress: {
        findMany: jest.fn().mockResolvedValue([
          {
            completed: false,
            status: ProgressStatus.IN_PROGRESS,
            progress: 40,
            mission: { code: 'M.1' },
          },
        ]),
      },
      challengeProgress: { findMany: jest.fn().mockResolvedValue([]) },
      quizProgress: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ isCorrect: false, quiz: { code: 'Q.1' } }]),
      },
      foodFactProgress: {
        findMany: jest.fn().mockResolvedValue([{ foodFact: { code: 'FF.1' } }]),
      },
      mission: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'm1',
            code: 'M.1',
            title: 'Log a meal',
            ...flags(true, true, false),
          },
        ]),
      },
      challenge: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { code: 'CH.1', title: 'Try it', ...flags(false, true, false) },
          ]),
      },
      quiz: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'qz1',
            code: 'Q.1',
            title: 'Why?',
            ...flags(true, false, false),
          },
        ]),
      },
      foodFact: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ff1',
            code: 'FF.1',
            title: 'Fact',
            ...flags(false, false, true),
          },
        ]),
      },
      microLearning: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new LearningProgressService(
      prisma as unknown as PrismaService,
      {} as DimensionLevelService,
      mockTranslationService() as unknown as TranslationService,
    );
    return { service, prisma };
  }

  const quest = {
    id: 'q1',
    code: 'QUEST.DIET_CHANGES.BEGINNER.1',
    name: 'Log food',
    description: null,
    level: ContentLevel.BEGINNER,
    dimension: { code: 'DIET_CHANGES' },
    items: [
      {
        contentType: QuestContentType.MISSION,
        contentCode: 'M.1',
        sortOrder: 0,
      },
      {
        contentType: QuestContentType.CHALLENGE,
        contentCode: 'CH.1',
        sortOrder: 1,
      },
      {
        contentType: QuestContentType.FOOD_FACT,
        contentCode: 'FF.1',
        sortOrder: 2,
      },
      { contentType: QuestContentType.QUIZ, contentCode: 'Q.1', sortOrder: 3 },
      {
        contentType: QuestContentType.MICRO_LEARNING,
        contentCode: 'ML.1',
        sortOrder: 4,
      },
    ],
  };

  it('returns null when no quest is selected', async () => {
    const { service } = buildCurrent(null);

    await expect(service.getCurrentQuest('u1')).resolves.toBeNull();
  });

  it('reports each trackable item with its status', async () => {
    const { service } = buildCurrent(quest);

    const current = await service.getCurrentQuest('u1');

    expect(current).toEqual({
      questId: 'q1',
      questCode: 'QUEST.DIET_CHANGES.BEGINNER.1',
      name: 'Log food',
      description: null,
      dimensionCode: 'DIET_CHANGES',
      level: ContentLevel.BEGINNER,
      progress: 25,
      completed: false,
      finishedItems: 1,
      totalItems: 4,
      items: [
        {
          contentType: QuestContentType.MISSION,
          contentCode: 'M.1',
          title: 'Log a meal',
          finished: false,
          status: ProgressStatus.IN_PROGRESS,
          progress: 40,
          sortOrder: 0,
        },
        {
          contentType: QuestContentType.CHALLENGE,
          contentCode: 'CH.1',
          title: 'Try it',
          finished: false,
          status: ProgressStatus.NOT_STARTED,
          progress: 0,
          sortOrder: 1,
        },
        {
          contentType: QuestContentType.FOOD_FACT,
          contentCode: 'FF.1',
          title: 'Fact',
          finished: true,
          status: ProgressStatus.COMPLETED,
          progress: 100,
          sortOrder: 2,
        },
        {
          contentType: QuestContentType.QUIZ,
          contentCode: 'Q.1',
          title: 'Why?',
          finished: false,
          status: ProgressStatus.FAILED,
          progress: 0,
          sortOrder: 3,
        },
      ],
    });
  });

  it('localizes the quest name and item titles', async () => {
    const { service } = buildCurrent(quest);

    const current = await service.getCurrentQuest('u1', 'de');

    expect(current?.name).toBe('Essen loggen');
    expect(current?.items.map((i) => i.title)).toEqual([
      'Mahlzeit loggen',
      'Try it',
      'Fact',
      'Why?',
    ]);
  });

  it('keeps a rewarded quest complete', async () => {
    const { service, prisma } = buildCurrent(quest);
    prisma.questProgress.findUnique.mockResolvedValue({ completed: true });

    const current = await service.getCurrentQuest('u1');

    expect(current).toMatchObject({
      completed: true,
      progress: 100,
      finishedItems: 1,
    });
  });
});
