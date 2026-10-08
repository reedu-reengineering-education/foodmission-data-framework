import { ContentLevel, QuestContentType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DimensionLevelService } from './dimension-level.service';
import { LearningProgressService } from './learning-progress.service';

const flags = (health: boolean, foodChoice: boolean, foodWaste: boolean) => ({
  health,
  foodChoice,
  foodWaste,
});

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
      findMany: jest
        .fn()
        .mockResolvedValue([
          { code: 'M.1', title: 'Log a meal', ...flags(true, true, false) },
        ]),
    },
    challenge: { findMany: jest.fn().mockResolvedValue([]) },
    quiz: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { code: 'Q.1', question: 'Why?', ...flags(true, false, false) },
        ]),
    },
    foodFact: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { code: 'FF.1', body: 'Fact', ...flags(false, false, true) },
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
  const service = new LearningProgressService(
    prisma as unknown as PrismaService,
    dimensionLevelService as unknown as DimensionLevelService,
  );
  return { service, prisma };
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
        kind: 'FOOD_AND_WASTE',
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

  it('404s for a dimension the user has no level in', async () => {
    const { service } = build();

    await expect(service.getDimension('u1', 'NOPE')).rejects.toThrow(
      'No level for dimension NOPE',
    );
  });
});
