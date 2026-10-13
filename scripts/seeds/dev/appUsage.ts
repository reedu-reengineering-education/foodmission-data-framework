import { Prisma, PrismaClient } from '@prisma/client';
import { randomInt as cryptoRandomInt } from 'crypto';
import {
  EventSource,
  EventSubjectType,
  EventType,
} from '../../../src/events/event-types';

/**
 * Synthetic app usage for the generated seed users (`seed-user-*`), so the
 * admin usage analytics (active users, weekly trend, per-country lines) have
 * realistic shapes:
 *
 * - Countries launch at different times; sign-ups ramp up after launch.
 * - Each user gets an engagement profile (power / regular / casual / churned)
 *   and weekly activity decays with weeks since registration.
 * - Activity is recorded as `APP_SESSION_OPENED` events (what the app sends via
 *   `POST /events`), and `createdAt` / `lastLoginAt` are aligned with it.
 *
 * Dates are relative to now, so each run deletes the previously seeded
 * sessions and regenerates them.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_WEEKS = 16;
const SEED_SESSION_PREFIX = 'seed-';
const BATCH_SIZE = 1000;

/** Weeks ago each pilot country went live; unlisted countries use the default. */
const COUNTRY_LAUNCH_WEEKS_AGO: Record<string, number> = {
  DE: 16,
  NL: 16,
  ES: 14,
  IT: 12,
  GB: 10,
  FR: 9,
  PL: 8,
  BE: 6,
  SE: 5,
};
const DEFAULT_LAUNCH_WEEKS_AGO = 4;

interface EngagementProfile {
  /** Chance the user is active in a given week, right after registration. */
  activeWeekChance: number;
  /** Multiplier applied to that chance per week since registration. */
  weeklyRetention: number;
  /** Session days per active week (inclusive range). */
  sessionDays: [number, number];
  /** Stops using the app after this many weeks (churned users only). */
  churnAfterWeeks?: [number, number];
}

const PROFILES: { weight: number; profile: EngagementProfile }[] = [
  {
    weight: 15,
    profile: {
      activeWeekChance: 0.97,
      weeklyRetention: 0.99,
      sessionDays: [4, 7],
    },
  },
  {
    weight: 35,
    profile: {
      activeWeekChance: 0.9,
      weeklyRetention: 0.96,
      sessionDays: [2, 4],
    },
  },
  {
    weight: 30,
    profile: {
      activeWeekChance: 0.6,
      weeklyRetention: 0.93,
      sessionDays: [1, 2],
    },
  },
  {
    weight: 15,
    profile: {
      activeWeekChance: 0.85,
      weeklyRetention: 0.9,
      sessionDays: [1, 3],
      churnAfterWeeks: [1, 4],
    },
  },
];
/** Share (in %) of users that register but never open the app. */
const NEVER_SEEN_PCT = 5;

const PLATFORMS = ['ios', 'android'] as const;
const APP_VERSIONS = ['1.4.0', '1.5.0', '1.5.1', '1.6.0'];

function random(): number {
  return cryptoRandomInt(0, 1_000_000) / 1_000_000;
}

function pickProfile(): EngagementProfile {
  const total = PROFILES.reduce((s, p) => s + p.weight, 0);
  let roll = cryptoRandomInt(0, total);
  for (const p of PROFILES) {
    if (roll < p.weight) return p.profile;
    roll -= p.weight;
  }
  return PROFILES[PROFILES.length - 1].profile;
}

/** Sign-up time after the country launch, skewed towards recent weeks. */
function registrationDate(now: number, country: string | null): Date {
  const launchWeeks =
    COUNTRY_LAUNCH_WEEKS_AGO[country ?? ''] ?? DEFAULT_LAUNCH_WEEKS_AGO;
  const windowMs = Math.min(launchWeeks, HISTORY_WEEKS) * 7 * DAY_MS;
  // u^1.3 puts more sign-ups closer to now (growing user base).
  return new Date(now - Math.floor(windowMs * random() ** 1.3));
}

/** Random time on the given UTC day between 07:00 and 22:59. */
function sessionTime(day: number): Date {
  return new Date(
    day +
      cryptoRandomInt(7, 23) * 60 * 60 * 1000 +
      cryptoRandomInt(0, 60) * 60 * 1000 +
      cryptoRandomInt(0, 60) * 1000,
  );
}

function sessionDates(
  now: number,
  registeredAt: Date,
  profile: EngagementProfile,
): Date[] {
  const sessions: Date[] = [];
  const churnAfter = profile.churnAfterWeeks
    ? cryptoRandomInt(
        profile.churnAfterWeeks[0],
        profile.churnAfterWeeks[1] + 1,
      )
    : Infinity;

  // First session on the sign-up day itself.
  sessions.push(
    new Date(
      Math.min(
        now,
        registeredAt.getTime() + cryptoRandomInt(1, 30) * 60 * 1000,
      ),
    ),
  );

  for (
    let weekStart = registeredAt.getTime(), week = 0;
    weekStart < now && week < churnAfter;
    weekStart += 7 * DAY_MS, week++
  ) {
    const chance = profile.activeWeekChance * profile.weeklyRetention ** week;
    if (random() >= chance) continue;

    const days = cryptoRandomInt(
      profile.sessionDays[0],
      profile.sessionDays[1] + 1,
    );
    const dayOffsets = new Set<number>();
    while (dayOffsets.size < days) dayOffsets.add(cryptoRandomInt(0, 7));

    for (const offset of dayOffsets) {
      const day = weekStart + offset * DAY_MS;
      const startOfDay = day - (day % DAY_MS);
      const at = sessionTime(startOfDay);
      if (at > registeredAt && at.getTime() < now) sessions.push(at);
    }
  }
  return sessions.sort((a, b) => a.getTime() - b.getTime());
}

export async function seedAppUsage(
  prisma: PrismaClient,
): Promise<{ users: number; sessions: number; neverSeen: number }> {
  console.log('📱 Seeding app usage (sessions for generated users)...');

  await prisma.userEvent.deleteMany({
    where: {
      eventType: EventType.APP_SESSION_OPENED,
      idempotencyKey: { contains: `:${SEED_SESSION_PREFIX}` },
    },
  });

  const users = await prisma.user.findMany({
    where: { keycloakId: { startsWith: 'seed-user-' } },
    select: { id: true, country: true },
  });

  const now = Date.now();
  let sessionsTotal = 0;
  let neverSeen = 0;
  let batch: Prisma.UserEventCreateManyInput[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    await prisma.userEvent.createMany({ data: batch, skipDuplicates: true });
    sessionsTotal += batch.length;
    batch = [];
  };

  for (const user of users) {
    const registeredAt = registrationDate(now, user.country);
    const sessions =
      cryptoRandomInt(0, 100) < NEVER_SEEN_PCT
        ? []
        : sessionDates(now, registeredAt, pickProfile());
    if (sessions.length === 0) neverSeen++;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        createdAt: registeredAt,
        lastLoginAt: sessions.at(-1) ?? null,
      },
    });

    const platform = PLATFORMS[cryptoRandomInt(0, PLATFORMS.length)];
    sessions.forEach((createdAt, i) => {
      const sessionId = `${SEED_SESSION_PREFIX}${user.id}-${i}`;
      batch.push({
        userId: user.id,
        eventType: EventType.APP_SESSION_OPENED,
        source: EventSource.APP,
        metadata: {
          sessionId,
          platform,
          appVersion: APP_VERSIONS[cryptoRandomInt(0, APP_VERSIONS.length)],
          subject: { type: EventSubjectType.USER },
        },
        idempotencyKey: `${EventType.APP_SESSION_OPENED}:${user.id}:${sessionId}`,
        createdAt,
      });
    });
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();

  console.log(
    `✅ Seeded ${sessionsTotal} app sessions for ${users.length} generated users (${neverSeen} never seen)`,
  );
  return { users: users.length, sessions: sessionsTotal, neverSeen };
}

// Standalone: npm run db:seed:app-usage (regenerates sessions relative to now)
if (require.main === module) {
  const prisma = new PrismaClient();
  seedAppUsage(prisma)
    .catch((e) => {
      console.error('\n❌ Seeding failed:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
