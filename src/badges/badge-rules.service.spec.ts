import { AfterCommitQueue } from '../common/after-commit/after-commit.queue';
import { Prisma, RewardSourceType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EventType } from '../events/event-types';
import { UserEventRecorder } from '../events/user-event-recorder.types';
import { CompletionRewardAwarder } from '../gamification/completion-reward.types';
import { ProgressStatus } from '../common/progress-status';
import { BadgeRulesDoc } from './badge-rule-schema';
import { BadgeRulesService } from './badge-rules.service';

/** Two badges: one counts recipe views, one counts a single shopping list. */
const RULES = {
  schemaVersion: 1,
  status: 'ready',
  purpose: 'test',
  badges: [
    {
      code: 'CHEF',
      shape: 'count_at_least',
      rule: {
        window: { type: 'lifetime' },
        counters: {
          recipesViewed: {
            event: 'LEARNING_RECIPE_EXPLORED',
            distinctBy: 'metadata.recipeId',
          },
        },
        target: 'recipesViewed >= 5',
        progress: 'min(recipesViewed / 5, 1)',
        notes: [],
      },
    },
    {
      code: 'SHOPPING_LIST',
      shape: 'one_shot_event',
      rule: {
        window: { type: 'lifetime' },
        counters: {
          listsCreated: { event: 'SHOPPING_LIST_CREATED' },
        },
        target: 'listsCreated >= 1',
        progress: 'min(listsCreated, 1)',
        notes: [],
      },
    },
  ],
} as unknown as BadgeRulesDoc;

const BADGES = [
  { id: 'badge-chef', code: 'CHEF', ruleCode: 'CHEF' },
  { id: 'badge-list', code: 'SHOPPING_LIST', ruleCode: 'SHOPPING_LIST' },
];

function recipeViews(count: number) {
  return Array.from({ length: count }, (_unused, index) => ({
    eventType: EventType.LEARNING_RECIPE_EXPLORED,
    createdAt: new Date(`2026-09-0${index + 1}T00:00:00.000Z`),
    metadata: { recipeId: `recipe-${index + 1}` },
  }));
}

function trigger(eventType: string, userId = 'u1') {
  return { userId, eventType, eventId: `evt-${eventType}` };
}

type MockDb = {
  $transaction: jest.Mock;
  $executeRaw: jest.Mock;
  badge: { findMany: jest.Mock };
  userEvent: { findMany: jest.Mock; findUnique: jest.Mock };
  userEarnedBadge: { findMany: jest.Mock; upsert: jest.Mock };
  badgeProgress: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    upsert: jest.Mock;
  };
  userGamificationWallet: { upsert: jest.Mock };
  reward: { findFirst: jest.Mock };
};

function buildDb(): MockDb {
  const db: MockDb = {
    // Interactive transactions run the callback on the same mock client.
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(db)),
    $executeRaw: jest.fn().mockResolvedValue(1),
    badge: { findMany: jest.fn().mockResolvedValue(BADGES) },
    userEvent: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue({ id: 'evt' }),
    },
    userEarnedBadge: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
    },
    badgeProgress: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
    },
    userGamificationWallet: { upsert: jest.fn().mockResolvedValue({}) },
    reward: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  return db;
}

describe('BadgeRulesService', () => {
  let prisma: MockDb;
  let recorder: jest.Mocked<UserEventRecorder>;
  let awarder: jest.Mocked<CompletionRewardAwarder>;
  let service: BadgeRulesService;

  beforeEach(() => {
    prisma = buildDb();
    recorder = {
      record: jest.fn().mockResolvedValue({ event: {}, replayed: false }),
    };
    awarder = {
      awardCompletion: jest.fn().mockResolvedValue({ xp: null, points: null }),
    };
    service = new BadgeRulesService(
      prisma as unknown as PrismaService,
      new AfterCommitQueue(),
      recorder,
      awarder,
    );
    jest.spyOn(service, 'load').mockReturnValue(RULES);
  });

  it('ignores an event no badge rule counts, without touching the database', async () => {
    await service.evaluateUserEvent(trigger(EventType.MEAL_LOGGED));

    expect(prisma.badge.findMany).not.toHaveBeenCalled();
    expect(prisma.userEvent.findMany).not.toHaveBeenCalled();
  });

  it('never re-enters on its own BADGE_EARNED output', async () => {
    await service.evaluateUserEvent(trigger(EventType.BADGE_EARNED));

    expect(prisma.badge.findMany).not.toHaveBeenCalled();
  });

  it('writes partial progress without awarding the badge', async () => {
    prisma.userEvent.findMany.mockResolvedValue(recipeViews(3));

    await service.evaluateUserEvent(
      trigger(EventType.LEARNING_RECIPE_EXPLORED),
    );
    await service.awaitPendingAwards();

    expect(prisma.badgeProgress.upsert).toHaveBeenCalledTimes(1);
    const written = prisma.badgeProgress.upsert.mock.calls[0][0];
    expect(written.create).toMatchObject({
      badgeId: 'badge-chef',
      progress: 60,
      completed: false,
      status: ProgressStatus.IN_PROGRESS,
    });
    expect(written.create.state).toMatchObject({
      counters: { recipesViewed: 3 },
    });
    expect(prisma.userEarnedBadge.upsert).not.toHaveBeenCalled();
  });

  it('counts distinct subjects only', async () => {
    const sameRecipeTwice = [
      ...recipeViews(1),
      {
        eventType: EventType.LEARNING_RECIPE_EXPLORED,
        createdAt: new Date('2026-09-02T00:00:00.000Z'),
        metadata: { recipeId: 'recipe-1' },
      },
    ];
    prisma.userEvent.findMany.mockResolvedValue(sameRecipeTwice);

    await service.evaluateUserEvent(
      trigger(EventType.LEARNING_RECIPE_EXPLORED),
    );

    expect(prisma.badgeProgress.upsert.mock.calls[0][0].create).toMatchObject({
      progress: 20,
    });
  });

  it('grants the badge, records it and credits its reward on completion', async () => {
    prisma.userEvent.findMany.mockResolvedValue(recipeViews(5));
    prisma.reward.findFirst.mockResolvedValue({
      id: 'reward-1',
      xp: 50,
      points: 20,
    });

    await service.evaluateUserEvent(
      trigger(EventType.LEARNING_RECIPE_EXPLORED),
    );
    await service.awaitPendingAwards();

    // The wallet row has to exist first: user_earned_badges has a foreign key
    // to it as well as to the user.
    expect(prisma.userGamificationWallet.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
    expect(prisma.userEarnedBadge.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: 'u1',
          badgeId: 'badge-chef',
          rewardId: 'reward-1',
          sourceType: RewardSourceType.BADGE,
        }),
      }),
    );
    expect(recorder.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: EventType.BADGE_EARNED,
        idempotencyKey: 'badge-earned:u1:badge-chef',
      }),
    );
    expect(awarder.awardCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: RewardSourceType.BADGE,
        sourceId: 'badge-chef',
        code: 'CHEF',
        reward: { id: 'reward-1', xp: 50, points: 20 },
      }),
    );
    // Marked earned last: it is what stops re-evaluation, so everything it
    // guards has to have happened first.
    const earnedAt = prisma.userEarnedBadge.upsert.mock.invocationCallOrder[0];
    expect(recorder.record.mock.invocationCallOrder[0]).toBeLessThan(earnedAt);
    expect(awarder.awardCompletion.mock.invocationCallOrder[0]).toBeLessThan(
      earnedAt,
    );
  });

  it('scores under a per-user advisory lock', async () => {
    prisma.userEvent.findMany.mockResolvedValue(recipeViews(3));

    await service.evaluateUserEvent(
      trigger(EventType.LEARNING_RECIPE_EXPLORED),
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const [sql, key] = prisma.$executeRaw.mock.calls[0];
    expect(sql.join('?')).toContain('pg_advisory_xact_lock');
    expect(key).toBe('badges:u1');
    expect(prisma.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.userEvent.findMany.mock.invocationCallOrder[0],
    );
  });

  it('leaves the badge unearned when its reward could not be paid', async () => {
    prisma.userEvent.findMany.mockResolvedValue(recipeViews(5));
    prisma.reward.findFirst.mockResolvedValue({
      id: 'reward-1',
      xp: 50,
      points: 20,
    });
    // awardCompletion logs wallet failures and returns null.
    awarder.awardCompletion.mockResolvedValue(null);

    await service.evaluateUserEvent(
      trigger(EventType.LEARNING_RECIPE_EXPLORED),
    );

    expect(prisma.userEarnedBadge.upsert).not.toHaveBeenCalled();
  });

  it('skips a badge the user already earned', async () => {
    prisma.userEarnedBadge.findMany.mockResolvedValue([
      { badgeId: 'badge-chef' },
    ]);
    prisma.userEvent.findMany.mockResolvedValue(recipeViews(5));

    await service.evaluateUserEvent(
      trigger(EventType.LEARNING_RECIPE_EXPLORED),
    );
    await service.awaitPendingAwards();

    expect(prisma.badgeProgress.upsert).not.toHaveBeenCalled();
    expect(prisma.userEarnedBadge.upsert).not.toHaveBeenCalled();
  });

  it('retries the grant when the row is complete but the badge was never granted', async () => {
    prisma.userEvent.findMany.mockResolvedValue(recipeViews(5));
    prisma.badgeProgress.findUnique.mockResolvedValue({
      progress: 100,
      completed: true,
    });

    await service.evaluateUserEvent(
      trigger(EventType.LEARNING_RECIPE_EXPLORED),
    );

    // Nothing moved, so no progress write — but the earlier grant was lost.
    expect(prisma.badgeProgress.upsert).not.toHaveBeenCalled();
    expect(prisma.userEarnedBadge.upsert).toHaveBeenCalledTimes(1);
  });

  it('retries stuck grants on login even though no rule counts it', async () => {
    prisma.badgeProgress.findMany.mockResolvedValue([
      { badgeId: 'badge-list', badge: { code: 'SHOPPING_LIST' } },
    ]);

    await service.evaluateUserEvent(trigger(EventType.USER_LOGGED_IN));

    expect(prisma.badgeProgress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'u1',
          completed: true,
          badge: { available: true, earnedByUsers: { none: { userId: 'u1' } } },
        },
      }),
    );
    // Nothing to score, so the ledger is never read — only the grant runs.
    expect(prisma.userEvent.findMany).not.toHaveBeenCalled();
    expect(prisma.userEarnedBadge.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ badgeId: 'badge-list' }),
      }),
    );
  });

  it('does not look for stuck grants on ordinary events', async () => {
    prisma.userEvent.findMany.mockResolvedValue(recipeViews(3));

    await service.evaluateUserEvent(
      trigger(EventType.LEARNING_RECIPE_EXPLORED),
    );

    expect(prisma.badgeProgress.findMany).not.toHaveBeenCalled();
  });

  it('does not cache an empty catalog', async () => {
    prisma.badge.findMany.mockResolvedValueOnce([]);
    prisma.userEvent.findMany.mockResolvedValue(recipeViews(3));

    await service.evaluateUserEvent(
      trigger(EventType.LEARNING_RECIPE_EXPLORED),
    );
    expect(prisma.badgeProgress.upsert).not.toHaveBeenCalled();

    // Seeded after the first event: the next one must see it without a restart.
    await service.evaluateUserEvent(
      trigger(EventType.LEARNING_RECIPE_EXPLORED),
    );
    expect(prisma.badge.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.badgeProgress.upsert).toHaveBeenCalledTimes(1);
  });

  it('re-reads the catalog once it expires', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(0);

    await service.evaluateUserEvent(
      trigger(EventType.LEARNING_RECIPE_EXPLORED),
    );
    await service.evaluateUserEvent(
      trigger(EventType.LEARNING_RECIPE_EXPLORED),
    );
    expect(prisma.badge.findMany).toHaveBeenCalledTimes(1);

    now.mockReturnValue(BadgeRulesService.CATALOG_TTL_MS);
    await service.evaluateUserEvent(
      trigger(EventType.LEARNING_RECIPE_EXPLORED),
    );
    expect(prisma.badge.findMany).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });

  it('reads the ledger unbounded but narrowed to the counted event types', async () => {
    await service.evaluateUserEvent(
      trigger(EventType.LEARNING_RECIPE_EXPLORED),
    );

    const where = prisma.userEvent.findMany.mock.calls[0][0]
      .where as Prisma.UserEventWhereInput;
    expect(where).toEqual({
      userId: 'u1',
      eventType: { in: [EventType.LEARNING_RECIPE_EXPLORED] },
    });
    // No createdAt bound: a lifetime window must not expire a badge.
    expect(where.createdAt).toBeUndefined();
  });

  it('runs nothing on the caller transaction and evaluates once the event commits', async () => {
    prisma.userEvent.findMany.mockResolvedValue(recipeViews(5));
    const queue = new AfterCommitQueue();
    const schedule = jest.spyOn(queue, 'schedule');
    service = new BadgeRulesService(
      prisma as unknown as PrismaService,
      queue,
      recorder,
      awarder,
    );
    jest.spyOn(service, 'load').mockReturnValue(RULES);

    await service.evaluateUserEvent(
      trigger(EventType.LEARNING_RECIPE_EXPLORED),
      { afterCommit: true },
    );

    // A failed statement would poison the caller's transaction, and granting
    // deadlocks on the wallet lock — so nothing may run before the commit.
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(prisma.badge.findMany).not.toHaveBeenCalled();
    expect(prisma.badgeProgress.upsert).not.toHaveBeenCalled();

    await service.awaitPendingAwards();

    expect(prisma.userEvent.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: `evt-${EventType.LEARNING_RECIPE_EXPLORED}` },
      }),
    );
    expect(prisma.userEarnedBadge.upsert).toHaveBeenCalledTimes(1);
  });
});
