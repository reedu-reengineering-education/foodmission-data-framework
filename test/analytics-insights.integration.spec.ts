/**
 * Admin insights integration tests: runs every insight's raw SQL against the
 * test database with a small fixture and checks the counts.
 *
 * Uses TEST_DATABASE_URL (never the dev DB; test/setup.ts loads it from
 * .env.test). Skipped when unset; fails when the DB is unreachable, so a
 * green run always means the SQL ran. Fixture rows are prefixed with
 * ITEST and removed before and after the suite. Users get the countries
 * XA (7 users) and XB (2 users), so other data in the test DB can be told
 * apart with breakdown=country. XC (5 users, no activity) is the smallest
 * visible country, so it absorbs the complementary suppression of XB.
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { PrismaService } from '../src/database/prisma.service';
import { INSIGHTS } from '../src/analytics/insights/insights.registry';
import { InsightRunner } from '../src/analytics/shared/insight-runner.service';
import { InsightResponse, InsightRow } from '../src/analytics/shared/insight';

const testDbUrl = process.env.TEST_DATABASE_URL;
const describeWithDb = testDbUrl ? describe : describe.skip;

const P = 'ITEST';

function byInsight(id: string) {
  const definition = INSIGHTS.find((insight) => insight.id === id);
  if (!definition) throw new Error(`Unknown insight ${id}`);
  return definition;
}

function find(
  response: InsightResponse,
  group: Record<string, string>,
): InsightRow | undefined {
  return response.rows.find((row) =>
    Object.entries(group).every(([key, value]) => row.group[key] === value),
  );
}

async function cleanup(prisma: PrismaClient) {
  await prisma.user.deleteMany({ where: { keycloakId: { startsWith: P } } });
  await prisma.badge.deleteMany({ where: { code: { startsWith: P } } });
  // Cascades to topics, quests, missions, challenges, quizzes and food facts.
  await prisma.dimension.deleteMany({ where: { code: { startsWith: P } } });
}

describeWithDb('Admin insights (integration)', () => {
  let prisma: PrismaClient;
  let runner: InsightRunner;

  beforeAll(async () => {
    if (!testDbUrl || !/test/i.test(testDbUrl)) {
      throw new Error(`Refusing to run against a non-test DB: ${testDbUrl}`);
    }
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe',
    });
    prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
    runner = new InsightRunner(prisma as unknown as PrismaService);
    await cleanup(prisma);

    const dimension = await prisma.dimension.create({
      data: { code: `${P}_DIM`, name: 'Itest dimension', sortOrder: 99 },
    });
    const topic = await prisma.topic.create({
      data: {
        code: `${P}_TOPIC`,
        name: 'Itest topic',
        dimensionId: dimension.id,
      },
    });
    const quest = await prisma.quest.create({
      data: {
        code: `${P}_QUEST`,
        dimensionId: dimension.id,
        level: 'BEGINNER',
      },
    });
    const mission = await prisma.mission.create({
      data: {
        code: `${P}_MISSION`,
        dimensionId: dimension.id,
        level: 'BEGINNER',
        title: 'Itest mission',
        duration: '7 days',
        goal: 'goal',
        whyItMatters: 'why',
      },
    });
    const quiz = await prisma.quiz.create({
      data: {
        code: `${P}_QUIZ`,
        topicId: topic.id,
        level: 'BEGINNER',
        title: 'Itest quiz',
        question: 'q',
        explanation: 'e',
      },
    });
    const fact = await prisma.foodFact.create({
      data: {
        code: `${P}_FACT`,
        topicId: topic.id,
        level: 'BEGINNER',
        title: 'Itest fact',
        body: 'b',
      },
    });
    const badge = await prisma.badge.create({
      data: { code: `${P}_BADGE`, name: 'Itest badge' },
    });

    const users = await Promise.all(
      Array.from({ length: 9 }, (_, i) =>
        prisma.user.create({
          data: {
            keycloakId: `${P}-${i}`,
            email: `${P.toLowerCase()}-${i}@example.com`,
            country: i < 7 ? ' xa' : 'XB',
            gender: i % 2 ? 'FEMALE' : 'MALE',
            yearOfBirth: 1990,
            preferences: { motivation: 'PLANETARY_IMPACT' },
            currentQuestId: i < 6 ? quest.id : null,
          },
        }),
      ),
    );
    const ids = users.map((user) => user.id);
    await prisma.user.createMany({
      data: Array.from({ length: 5 }, (_, i) => ({
        keycloakId: `${P}-XC-${i}`,
        email: `${P.toLowerCase()}-xc-${i}@example.com`,
        country: 'XC',
      })),
    });

    await prisma.userDimensionLevel.createMany({
      data: ids.map((userId, i) => ({
        userId,
        dimensionId: dimension.id,
        level: i < 6 ? 'BEGINNER' : 'INTERMEDIATE',
      })),
    });
    await prisma.questProgress.createMany({
      data: [0, 1, 2, 3].map((i) => ({
        userId: ids[i],
        questId: quest.id,
        progress: i === 0 ? 100 : 50,
        completed: i === 0,
      })),
    });
    // 0 completed by rule, 1 self-reported, 2 failed without activity,
    // 3 given up after progress, 4 and 5 seeded but not started.
    await prisma.missionProgress.createMany({
      data: [
        {
          userId: ids[0],
          missionId: mission.id,
          progress: 100,
          completed: true,
          status: 'COMPLETED',
        },
        {
          userId: ids[1],
          missionId: mission.id,
          progress: 100,
          completed: true,
          status: 'COMPLETED',
        },
        {
          userId: ids[2],
          missionId: mission.id,
          progress: 0,
          status: 'FAILED',
        },
        {
          userId: ids[3],
          missionId: mission.id,
          progress: 30,
          status: 'FAILED',
        },
        { userId: ids[4], missionId: mission.id, progress: 0 },
        { userId: ids[5], missionId: mission.id, progress: 0 },
      ],
    });
    await prisma.quizProgress.createMany({
      data: [0, 1, 2, 3, 4].map((i) => ({
        userId: ids[i],
        quizId: quiz.id,
        completed: true,
        isCorrect: i < 3,
        answeredAt: new Date(),
      })),
    });
    await prisma.foodFactProgress.createMany({
      data: [0, 1, 2, 3].map((i) => ({ userId: ids[i], foodFactId: fact.id })),
    });
    await prisma.userGamificationWallet.createMany({
      data: ids.slice(0, 6).map((userId, i) => ({ userId, xp: i * 100 })),
    });
    await prisma.userEarnedBadge.createMany({
      data: [0, 1].map((i) => ({ userId: ids[i], badgeId: badge.id })),
    });
    await prisma.walletEntry.createMany({
      data: [0, 1].map((i) => ({
        userId: ids[i],
        currency: 'XP' as const,
        amount: 50,
        balanceAfter: 50,
        reason: 'Mission completed',
        sourceType: 'MISSION' as const,
        sourceId: mission.id,
      })),
    });
    await prisma.userEvent.createMany({
      data: [
        ...ids.slice(0, 8).map((userId, i) => ({
          userId,
          eventType: 'APP_SESSION_OPENED',
          source: 'app',
          metadata: {
            platform: i < 6 ? 'ios' : 'android',
            appVersion: '1.0.0',
          },
        })),
        ...ids.slice(0, 5).map((userId) => ({
          userId,
          eventType: 'MEAL_LOGGED',
          source: 'meal_log',
        })),
        {
          userId: ids[0],
          eventType: 'MISSION_COMPLETED',
          source: 'mission',
          metadata: { missionId: mission.id, source: 'RULE_ENGINE' },
        },
        {
          userId: ids[3],
          eventType: 'MISSION_STARTED',
          source: 'mission',
          metadata: { missionId: mission.id, source: 'api' },
        },
        {
          userId: ids[3],
          eventType: 'MISSION_FAILED',
          source: 'mission',
          metadata: { missionId: mission.id, source: 'api' },
        },
        {
          userId: ids[2],
          eventType: 'MISSION_FAILED',
          source: 'mission',
          metadata: { missionId: mission.id, source: 'RULE_ENGINE' },
        },
        {
          userId: ids[6],
          eventType: 'DIMENSION_LEVEL_UP',
          source: 'quest',
          metadata: {
            dimensionCode: `${P}_DIM`,
            from: 'BEGINNER',
            to: 'INTERMEDIATE',
          },
        },
      ],
    });
  }, 120000);

  afterAll(async () => {
    if (prisma) {
      await cleanup(prisma);
      await prisma.$disconnect();
    }
  });

  const dim = { dimension: `${P}_DIM` };

  it('runs every insight with every rollup and up to two breakdowns', async () => {
    for (const insight of INSIGHTS) {
      for (const by of insight.by ?? [undefined]) {
        for (const query of [
          { by },
          { by, breakdown: 'country' },
          { by, breakdown: 'ageGroup', breakdown2: 'motivation' },
        ]) {
          const response = await runner.run(insight, query);
          expect(response.meta.insight).toBe(insight.id);
          for (const row of response.rows) {
            for (const key of insight.values) {
              expect(row.values).toHaveProperty(key);
            }
          }
        }
      }
    }
  });

  it('users: splits by normalised country and suppresses small groups', async () => {
    const response = await runner.run(byInsight('users'), {
      breakdown: 'country',
    });
    expect(find(response, { country: 'XA' })?.values).toMatchObject({
      users: 7,
      active7d: 7,
      new7d: 7,
    });
    // XB is too small; XC is hidden as its complement.
    expect(find(response, { country: 'XB' })).toBeUndefined();
    expect(find(response, { country: 'XC' })).toBeUndefined();
    expect(response.meta.suppressedGroups).toBeGreaterThanOrEqual(2);
  });

  it('sessions and feature usage count this week', async () => {
    const sessions = await runner.run(byInsight('sessions'), {
      by: 'appVersion',
      weeks: 1,
    });
    expect(find(sessions, { appVersion: '1.0.0' })?.values).toEqual({
      sessions: 8,
      users: 8,
      sessionsPerUser: 1,
    });
    // Platform splits users: XA/android (1 user) is too small and XA/ios (6)
    // would reveal it next to the by=total XA row, so both are hidden.
    const byPlatform = await runner.run(byInsight('sessions'), {
      by: 'platform',
      breakdown: 'country',
      weeks: 1,
    });
    expect(
      find(byPlatform, { country: 'XA', platform: 'ios' }),
    ).toBeUndefined();
    const platforms = await runner.run(byInsight('sessions'), {
      by: 'platform',
      weeks: 1,
    });
    expect(find(platforms, { platform: 'android' })).toBeUndefined();
    const features = await runner.run(byInsight('feature-usage'), {
      breakdown: 'country',
      weeks: 1,
    });
    expect(
      find(features, { country: 'XA', family: 'meal_logging' })?.values.users,
    ).toBe(5);
  });

  it('dimension levels and focus', async () => {
    const levels = await runner.run(byInsight('dimension-levels'), {});
    expect(find(levels, { ...dim, level: 'BEGINNER' })?.values.users).toBe(6);
    expect(find(levels, { ...dim, level: 'INTERMEDIATE' })?.values.users).toBe(
      3,
    );

    const focus = await runner.run(byInsight('dimension-focus'), {});
    expect(find(focus, { ...dim, level: 'BEGINNER' })?.values.users).toBe(6);

    const levelUps = await runner.run(byInsight('dimension-level-ups'), {
      weeks: 1,
    });
    expect(find(levelUps, { ...dim, level: 'INTERMEDIATE' })?.values).toEqual({
      levelUps: 1,
      users: 1,
    });
  });

  it('quest progress counts current and progress users', async () => {
    const response = await runner.run(byInsight('quest-progress'), {});
    expect(find(response, { quest: `${P}_QUEST` })?.values).toEqual({
      users: 6,
      currentUsers: 6,
      startedUsers: 4,
      completedUsers: 1,
      avgProgress: 41.7,
    });
  });

  it('mission progress separates rule and self-reported outcomes', async () => {
    const response = await runner.run(byInsight('mission-progress'), {});
    expect(find(response, { mission: `${P}_MISSION` })?.values).toEqual({
      users: 6,
      activeUsers: 3,
      completedUsers: 2,
      completions: 2,
      completionsByRule: 1,
      completionsSelfReported: 1,
      failures: 2,
      failuresByUser: 1,
      failuresWithoutActivity: 1,
      avgProgress: 38.3,
    });
    const rollup = await runner.run(byInsight('mission-progress'), {
      by: 'dimension',
    });
    expect(find(rollup, dim)?.group).toEqual(dim);
  });

  it('quiz, food facts, badges and XP', async () => {
    const quiz = await runner.run(byInsight('quiz-results'), { by: 'topic' });
    expect(find(quiz, { topic: `${P}_TOPIC` })?.values).toEqual({
      users: 5,
      answers: 5,
      correctAnswers: 3,
      correctRate: 0.6,
    });

    const facts = await runner.run(byInsight('food-facts-read'), {});
    expect(find(facts, { foodFact: `${P}_FACT` })?.values.users).toBe(4);

    const badges = await runner.run(byInsight('badges'), {});
    expect(find(badges, { badge: `${P}_BADGE` })?.values.users).toBe(2);

    const xp = await runner.run(byInsight('xp-sources'), { by: 'dimension' });
    expect(find(xp, dim)?.values).toEqual({ xp: 100, entries: 2, users: 2 });

    const distribution = await runner.run(byInsight('xp-distribution'), {
      breakdown: 'country',
    });
    // XA: xp 0,100,200,300,400,500 and one user without a wallet.
    expect(find(distribution, { country: 'XA', bucket: '0' })).toBeUndefined();
    expect(distribution.meta.suppressedGroups).toBeGreaterThan(0);
  });
});
