import {
  PrismaClient,
  ProgressIndicatorKind,
  ProgressPrecision,
  User,
  UserGroup,
  UserSegment,
} from '@prisma/client';

/** SOFT indicator kinds seeded for every user/group (per Gamification.md §12). */
export const SOFT_PROGRESS_INDICATOR_KINDS: ProgressIndicatorKind[] = [
  ProgressIndicatorKind.FOOD_CHOICES,
  ProgressIndicatorKind.FOOD_AND_WASTE,
  ProgressIndicatorKind.HEALTH,
  ProgressIndicatorKind.CO2_REDUCTION,
  ProgressIndicatorKind.ENERGY_REDUCTION,
  ProgressIndicatorKind.WATER_SAVINGS,
  ProgressIndicatorKind.LAND_USE_REDUCTION,
];

const DEFAULT_TARGET_BY_SEGMENT: Record<UserSegment, number> = {
  [UserSegment.BEGINNER]: 10,
  [UserSegment.INTERMEDIATE]: 20,
  [UserSegment.ADVANCED]: 30,
};

function targetForSegment(segment: UserSegment | null | undefined): number {
  if (!segment) return DEFAULT_TARGET_BY_SEGMENT[UserSegment.BEGINNER];
  return DEFAULT_TARGET_BY_SEGMENT[segment];
}

async function upsertUserWallet(
  prisma: PrismaClient,
  user: User,
  wallet: { level: number; xp: number; points: number },
): Promise<void> {
  await prisma.userGamificationWallet.upsert({
    where: { userId: user.id },
    update: wallet,
    create: {
      userId: user.id,
      ...wallet,
    },
  });
}

async function upsertSoftIndicatorsForUser(
  prisma: PrismaClient,
  user: User,
): Promise<number> {
  const targetValue = targetForSegment(user.segment);
  let count = 0;

  for (const kind of SOFT_PROGRESS_INDICATOR_KINDS) {
    await prisma.progressIndicator.upsert({
      where: {
        userId_kind: { userId: user.id, kind },
      },
      update: {
        precision: ProgressPrecision.SOFT,
        targetValue,
      },
      create: {
        userId: user.id,
        kind,
        precision: ProgressPrecision.SOFT,
        level: 1,
        accumulatedValue: 0,
        targetValue,
        allTimeTotal: 0,
      },
    });
    count += 1;
  }

  return count;
}

async function upsertSoftIndicatorsForGroup(
  prisma: PrismaClient,
  group: UserGroup,
  targetValue = 25,
): Promise<number> {
  let count = 0;

  for (const kind of SOFT_PROGRESS_INDICATOR_KINDS) {
    await prisma.progressIndicator.upsert({
      where: {
        groupId_kind: { groupId: group.id, kind },
      },
      update: {
        precision: ProgressPrecision.SOFT,
        targetValue,
      },
      create: {
        groupId: group.id,
        kind,
        precision: ProgressPrecision.SOFT,
        level: 1,
        accumulatedValue: 0,
        targetValue,
        allTimeTotal: 0,
      },
    });
    count += 1;
  }

  return count;
}

/** Named-dev wallets with varied progress for manual testing. */
const NAMED_USER_WALLETS: Record<
  string,
  { level: number; xp: number; points: number }
> = {
  'dev@foodmission.dev': { level: 3, xp: 450, points: 120 },
  'jane.smith@example.com': { level: 2, xp: 180, points: 55 },
  'mike.johnson@example.com': { level: 1, xp: 40, points: 10 },
  'sarah.wilson@example.com': { level: 4, xp: 900, points: 250 },
  'admin@foodmission.dev': { level: 5, xp: 1500, points: 400 },
};

export async function seedGamificationProfiles(prisma: PrismaClient): Promise<{
  wallets: number;
  userIndicators: number;
  groupIndicators: number;
}> {
  console.log('🎮 Seeding gamification wallets and progress indicators...');

  const namedEmails = Object.keys(NAMED_USER_WALLETS);
  const namedUsers = await prisma.user.findMany({
    where: { email: { in: namedEmails } },
  });

  let wallets = 0;
  let userIndicators = 0;

  for (const user of namedUsers) {
    const wallet =
      NAMED_USER_WALLETS[user.email] ?? { level: 1, xp: 0, points: 0 };
    await upsertUserWallet(prisma, user, wallet);
    wallets += 1;
    userIndicators += await upsertSoftIndicatorsForUser(prisma, user);
  }

  // Sample of generated seed users so Studio/API have bulk data
  const generatedUsers = await prisma.user.findMany({
    where: { keycloakId: { startsWith: 'seed-user-' } },
    take: 50,
    orderBy: { email: 'asc' },
  });

  for (const user of generatedUsers) {
    await upsertUserWallet(prisma, user, {
      level: 1,
      xp: 0,
      points: 0,
    });
    wallets += 1;
    userIndicators += await upsertSoftIndicatorsForUser(prisma, user);
  }

  const groups = await prisma.userGroup.findMany();
  let groupIndicators = 0;
  for (const group of groups) {
    // Placeholder quest id until Quest catalog exists
    if (!group.currentQuestId) {
      await prisma.userGroup.update({
        where: { id: group.id },
        data: { currentQuestId: `seed-group-quest-${group.id.slice(0, 8)}` },
      });
    }
    groupIndicators += await upsertSoftIndicatorsForGroup(prisma, group);
  }

  console.log(
    `✅ Gamification profile seed: ${wallets} wallets, ${userIndicators} user indicators, ${groupIndicators} group indicators`,
  );

  return { wallets, userIndicators, groupIndicators };
}
