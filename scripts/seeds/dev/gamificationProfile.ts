import {
  WalletCurrency,
  PrismaClient,
  ProgressPrecision,
  User,
  UserGroup,
} from '@prisma/client';
import {
  SOFT_PROGRESS_INDICATOR_KINDS,
  targetForSegment,
} from '../../../src/gamification/onboarding.utils';
import { assertProgressIndicatorOwner } from '../../../src/gamification/progress-indicator.utils';

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
  assertProgressIndicatorOwner({ userId: user.id });
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
  assertProgressIndicatorOwner({ groupId: group.id });
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

async function seedWalletHistoryForNamedUser(
  prisma: PrismaClient,
  user: User,
  wallet: { level: number; xp: number; points: number },
): Promise<{ events: number; entries: number }> {
  const pointsKey = `seed-points-${user.id}`;
  const xpKey = `seed-xp-${user.id}`;

  const existingPoints = await prisma.userEvent.findUnique({
    where: { idempotencyKey: pointsKey },
  });
  if (existingPoints) {
    return { events: 0, entries: 0 };
  }

  let events = 0;
  let entries = 0;

  if (wallet.points > 0) {
    const event = await prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: 'POINTS_AWARDED',
        source: 'seed',
        metadata: { source: 'dev-seed', subject: { type: 'SEED' } },
        idempotencyKey: pointsKey,
      },
    });
    await prisma.walletEntry.create({
      data: {
        userId: user.id,
        currency: WalletCurrency.POINTS,
        amount: wallet.points,
        balanceAfter: wallet.points,
        reason: 'SEED_INITIAL_POINTS',
        eventId: event.id,
      },
    });
    events += 1;
    entries += 1;
  }

  if (wallet.xp > 0) {
    const event = await prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: 'XP_AWARDED',
        source: 'seed',
        metadata: { source: 'dev-seed', subject: { type: 'SEED' } },
        idempotencyKey: xpKey,
      },
    });
    await prisma.walletEntry.create({
      data: {
        userId: user.id,
        currency: WalletCurrency.XP,
        amount: wallet.xp,
        balanceAfter: wallet.xp,
        reason: 'SEED_INITIAL_XP',
        eventId: event.id,
      },
    });
    events += 1;
    entries += 1;
  }

  return { events, entries };
}

export async function seedGamificationProfiles(prisma: PrismaClient): Promise<{
  wallets: number;
  userIndicators: number;
  groupIndicators: number;
  events: number;
  walletEntries: number;
}> {
  console.log('🎮 Seeding gamification wallets and progress indicators...');

  const namedEmails = Object.keys(NAMED_USER_WALLETS);
  const namedUsers = await prisma.user.findMany({
    where: { email: { in: namedEmails } },
  });

  let wallets = 0;
  let userIndicators = 0;
  let events = 0;
  let walletEntries = 0;

  for (const user of namedUsers) {
    const wallet =
      NAMED_USER_WALLETS[user.email] ?? { level: 1, xp: 0, points: 0 };
    await upsertUserWallet(prisma, user, wallet);
    wallets += 1;
    userIndicators += await upsertSoftIndicatorsForUser(prisma, user);
    const history = await seedWalletHistoryForNamedUser(prisma, user, wallet);
    events += history.events;
    walletEntries += history.entries;
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
    `✅ Gamification profile seed: ${wallets} wallets, ${userIndicators} user indicators, ${groupIndicators} group indicators, ${events} events, ${walletEntries} wallet entries`,
  );

  return { wallets, userIndicators, groupIndicators, events, walletEntries };
}
