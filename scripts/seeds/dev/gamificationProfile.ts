import { WalletCurrency, PrismaClient, User } from '@prisma/client';

async function upsertUserWallet(
  prisma: PrismaClient,
  user: User,
  wallet: { xp: number; points: number },
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

/** Named-dev wallets with varied progress for manual testing. */
const NAMED_USER_WALLETS: Record<string, { xp: number; points: number }> = {
  'dev@foodmission.dev': { xp: 450, points: 120 },
  'jane.smith@example.com': { xp: 180, points: 55 },
  'mike.johnson@example.com': { xp: 40, points: 10 },
  'sarah.wilson@example.com': { xp: 900, points: 250 },
  'admin@foodmission.dev': { xp: 1500, points: 400 },
};

async function seedWalletHistoryForNamedUser(
  prisma: PrismaClient,
  user: User,
  wallet: { xp: number; points: number },
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
  events: number;
  walletEntries: number;
}> {
  console.log('🎮 Seeding gamification wallets...');

  const namedEmails = Object.keys(NAMED_USER_WALLETS);
  const namedUsers = await prisma.user.findMany({
    where: { email: { in: namedEmails } },
  });

  let wallets = 0;
  let events = 0;
  let walletEntries = 0;

  for (const user of namedUsers) {
    const wallet = NAMED_USER_WALLETS[user.email] ?? { xp: 0, points: 0 };
    await upsertUserWallet(prisma, user, wallet);
    wallets += 1;
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
      xp: 0,
      points: 0,
    });
    wallets += 1;
  }

  const groups = await prisma.userGroup.findMany();
  for (const group of groups) {
    // Placeholder quest id until Quest catalog exists
    if (!group.currentQuestId) {
      await prisma.userGroup.update({
        where: { id: group.id },
        data: { currentQuestId: `seed-group-quest-${group.id.slice(0, 8)}` },
      });
    }
  }

  console.log(
    `✅ Gamification profile seed: ${wallets} wallets, ${events} events, ${walletEntries} wallet entries`,
  );

  return { wallets, events, walletEntries };
}
