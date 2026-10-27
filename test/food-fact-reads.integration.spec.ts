import { PrismaClient, ProgressStatus, QuestContentType } from '@prisma/client';
import { execSync } from 'child_process';
import { PrismaService } from '../src/database/prisma.service';
import {
  findFinishedItemKeys,
  findItemStatuses,
  foodFactReadsWhere,
} from '../src/gamification/content-completion';

const testDbUrl = process.env.TEST_DATABASE_URL;
const describeWithDb = testDbUrl ? describe : describe.skip;

const P = 'FFREADS';
const fact = (n: number) => `${P}_FACT_${n}`;
const item = (code: string) => ({
  contentType: QuestContentType.FOOD_FACT,
  contentCode: code,
});

async function cleanup(prisma: PrismaClient) {
  await prisma.user.deleteMany({ where: { keycloakId: { startsWith: P } } });
  await prisma.dimension.deleteMany({ where: { code: { startsWith: P } } });
}

describeWithDb('food fact reads (integration)', () => {
  let prisma: PrismaClient;
  let db: PrismaService;
  let reader: string;

  beforeAll(async () => {
    if (!testDbUrl || !/test/i.test(testDbUrl)) {
      throw new Error(`Refusing to run against a non-test DB: ${testDbUrl}`);
    }
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe',
    });
    prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
    db = prisma as unknown as PrismaService;
    await cleanup(prisma);

    const dimension = await prisma.dimension.create({
      data: { code: `${P}_DIM`, name: 'Reads dimension', sortOrder: 99 },
    });
    const topic = await prisma.topic.create({
      data: {
        code: `${P}_TOPIC`,
        name: 'Reads topic',
        dimensionId: dimension.id,
      },
    });
    const facts = await Promise.all(
      [1, 2, 3].map((n) =>
        prisma.foodFact.create({
          data: {
            code: fact(n),
            topicId: topic.id,
            level: 'BEGINNER',
            title: 'Reads fact',
            body: 'b',
          },
        }),
      ),
    );
    const [readerUser, otherUser] = await Promise.all(
      ['a', 'b'].map((suffix) =>
        prisma.user.create({
          data: {
            keycloakId: `${P}-${suffix}`,
            email: `${P.toLowerCase()}-${suffix}@example.com`,
          },
        }),
      ),
    );
    reader = readerUser.id;
    await prisma.foodFactProgress.createMany({
      data: [
        { userId: reader, foodFactId: facts[0].id },
        { userId: reader, foodFactId: facts[1].id },
        { userId: otherUser.id, foodFactId: facts[2].id },
      ],
    });
  });

  afterAll(async () => {
    if (prisma) {
      await cleanup(prisma);
      await prisma.$disconnect();
    }
  });

  it('matches only the user own reads among the requested codes', async () => {
    const rows = await prisma.foodFactProgress.findMany({
      where: foodFactReadsWhere(reader, [fact(1), fact(3)]),
      select: { foodFact: { select: { code: true } } },
    });

    expect(rows.map((row) => row.foodFact.code)).toEqual([fact(1)]);
  });

  it('reports read facts as finished and unread ones as not started', async () => {
    const items = [1, 2, 3].map((n) => item(fact(n)));
    const [finished, statuses] = await Promise.all([
      findFinishedItemKeys(db, reader, items),
      findItemStatuses(db, reader, items),
    ]);

    expect([...finished].sort()).toEqual([
      `FOOD_FACT:${fact(1)}`,
      `FOOD_FACT:${fact(2)}`,
    ]);
    expect(statuses.get(`FOOD_FACT:${fact(1)}`)?.status).toBe(
      ProgressStatus.COMPLETED,
    );
    expect(statuses.get(`FOOD_FACT:${fact(2)}`)?.status).toBe(
      ProgressStatus.COMPLETED,
    );
    expect(statuses.get(`FOOD_FACT:${fact(3)}`)?.status).toBe(
      ProgressStatus.NOT_STARTED,
    );
  });
});
