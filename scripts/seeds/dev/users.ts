import {
  ActivityLevel,
  AnnualIncomeLevel,
  EducationLevel,
  Gender,
  Motivation,
  PrismaClient,
  ProgressPrecision,
  User,
  UserSegment,
  WeeklyBeefFrequency,
  WeeklyFoodWasteRange,
  WeeklyMeatRange,
  WeeklyReusableRange,
  WeeklyUpfRange,
} from '@prisma/client';
import { randomInt as cryptoRandomInt } from 'crypto';
import { KEYCLOAK_DEV_USER_IDS } from './keycloak-dev-user-ids';
import { deriveUserSegment } from '../../../src/gamification/onboarding-scoring';
import { OnboardingBaselines } from '../../../src/gamification/onboarding.utils';
import {
  getStageTarget,
  SUSTAINABILITY_WHEEL_KINDS,
} from '../../../src/gamification/progress-wheels.config';

/** `userInfo.segment` overrides; otherwise derived from the five baselines. */
function resolveSeedSegment(userInfo: UserSeedData): UserSegment | undefined {
  if (userInfo.segment) return userInfo.segment;

  const baselines: Partial<OnboardingBaselines> = {
    weeklyMeatConsumption: userInfo.weeklyMeatConsumption,
    weeklyBeefConsumption: userInfo.weeklyBeefConsumption,
    weeklyFoodWaste: userInfo.weeklyFoodWaste,
    weeklyUpfConsumption: userInfo.weeklyUpfConsumption,
    weeklyReusableOrRefill: userInfo.weeklyReusableOrRefill,
  };
  const complete = Object.values(baselines).every((v) => v != null);
  return complete
    ? deriveUserSegment(baselines as OnboardingBaselines)
    : undefined;
}

/** Same first-cycle seeding ProgressWheelService.ensureWheelsForUser does. */
async function seedSustainabilityWheels(
  prisma: PrismaClient,
  userId: string,
  segment: UserSegment,
): Promise<void> {
  for (const kind of SUSTAINABILITY_WHEEL_KINDS) {
    await prisma.progressIndicator.upsert({
      where: { userId_kind: { userId, kind } },
      update: {},
      create: {
        userId,
        kind,
        precision: ProgressPrecision.SOFT,
        level: 1,
        accumulatedValue: 0,
        targetValue: getStageTarget(kind, segment, 1),
      },
    });
  }
}

export interface UserSeedData {
  keycloakId: string;
  email: string;
  firstName: string;
  lastName: string;
  preferences?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  weeklyMeatConsumption?: WeeklyMeatRange;
  weeklyBeefConsumption?: WeeklyBeefFrequency;
  weeklyFoodWaste?: WeeklyFoodWasteRange;
  weeklyUpfConsumption?: WeeklyUpfRange;
  weeklyReusableOrRefill?: WeeklyReusableRange;
  segment?: UserSegment;
  currentQuestId?: string;
  lastLoginAt?: Date;
}

export const userData: UserSeedData[] = [
  {
    keycloakId: KEYCLOAK_DEV_USER_IDS.devUser1,
    email: 'dev@foodmission.dev',
    firstName: 'Developer',
    lastName: 'User',
    preferences: {
      dietaryRestrictions: ['vegetarian'],
      allergies: ['nuts'],
      preferredCategories: ['Fruits', 'Vegetables', 'Dairy'],
      foodExclusions: ['nuts', 'peanuts'],
      motivation: Motivation.SUSTAINABLE_HABITS,
      dailyTimeCommitmentMinutes: 10,
      showNutriScore: true,
      avoidUpf: true,
    },
    settings: {
      notificationsEnabled: true,
      notificationPreferredTime: '09:00',
    },
    weeklyMeatConsumption: WeeklyMeatRange.ZERO_TO_FOUR,
    weeklyBeefConsumption: WeeklyBeefFrequency.LESS_THAN_ONCE_PER_WEEK,
    weeklyFoodWaste: WeeklyFoodWasteRange.ONE_TO_TWO,
    weeklyUpfConsumption: WeeklyUpfRange.ZERO_TO_THREE,
    weeklyReusableOrRefill: WeeklyReusableRange.THREE_TO_SIX,
    // segment: derived from the baselines above, see resolveSeedSegment()
    lastLoginAt: new Date(),
  },
  {
    keycloakId: KEYCLOAK_DEV_USER_IDS.devUser2,
    email: 'jane.smith@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    preferences: {
      dietaryRestrictions: ['vegan', 'gluten-free'],
      allergies: ['dairy', 'gluten'],
      preferredCategories: ['Fruits', 'Vegetables', 'Proteins'],
      foodExclusions: ['dairy', 'gluten', 'meat'],
      motivation: Motivation.PLANETARY_IMPACT,
      dailyTimeCommitmentMinutes: 15,
      showNutriScore: true,
      avoidUpf: true,
    },
    settings: {
      notificationsEnabled: false,
      notificationPreferredTime: '10:00',
    },
    weeklyMeatConsumption: WeeklyMeatRange.ZERO_TO_FOUR,
    weeklyBeefConsumption: WeeklyBeefFrequency.NEVER,
    weeklyFoodWaste: WeeklyFoodWasteRange.ZERO,
    weeklyUpfConsumption: WeeklyUpfRange.ZERO_TO_THREE,
    weeklyReusableOrRefill: WeeklyReusableRange.SEVEN_TO_NINE,
    lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    keycloakId: KEYCLOAK_DEV_USER_IDS.devUser3,
    email: 'mike.johnson@example.com',
    firstName: 'Mike',
    lastName: 'Johnson',
    preferences: {
      dietaryRestrictions: [],
      allergies: ['shellfish'],
      preferredCategories: ['Proteins', 'Grains', 'Dairy'],
      foodExclusions: ['shellfish'],
      motivation: Motivation.SUSTAINABILITY_KNOWLEDGE,
      dailyTimeCommitmentMinutes: 5,
      showNutriScore: true,
      avoidUpf: false,
    },
    settings: {
      notificationsEnabled: true,
      notificationPreferredTime: '18:30',
    },
    weeklyMeatConsumption: WeeklyMeatRange.TEN_TO_FOURTEEN,
    weeklyBeefConsumption: WeeklyBeefFrequency.ONE_TO_TWO_TIMES_PER_WEEK,
    weeklyFoodWaste: WeeklyFoodWasteRange.THREE_TO_FOUR,
    weeklyUpfConsumption: WeeklyUpfRange.TEN_TO_FOURTEEN,
    weeklyReusableOrRefill: WeeklyReusableRange.ZERO_TO_TWO,
    lastLoginAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    keycloakId: KEYCLOAK_DEV_USER_IDS.devUser4,
    email: 'sarah.wilson@example.com',
    firstName: 'Sarah',
    lastName: 'Wilson',
    preferences: {
      dietaryRestrictions: ['keto'],
      allergies: [],
      preferredCategories: ['Proteins', 'Dairy', 'Vegetables'],
      foodExclusions: [],
      motivation: Motivation.SUSTAINABLE_HABITS,
      dailyTimeCommitmentMinutes: 10,
      showNutriScore: false,
      avoidUpf: true,
    },
    settings: {
      notificationsEnabled: true,
      notificationPreferredTime: '08:00',
    },
    weeklyMeatConsumption: WeeklyMeatRange.FIVE_TO_NINE,
    weeklyBeefConsumption: WeeklyBeefFrequency.THREE_PLUS_TIMES_PER_WEEK,
    weeklyFoodWaste: WeeklyFoodWasteRange.ONE_TO_TWO,
    weeklyUpfConsumption: WeeklyUpfRange.FOUR_TO_NINE,
    weeklyReusableOrRefill: WeeklyReusableRange.THREE_TO_SIX,
    lastLoginAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    keycloakId: KEYCLOAK_DEV_USER_IDS.adminUser1,
    email: 'admin@foodmission.dev',
    firstName: 'Admin',
    lastName: 'User',
    preferences: {
      dietaryRestrictions: [],
      allergies: [],
      preferredCategories: [
        'Fruits',
        'Vegetables',
        'Proteins',
        'Grains',
        'Dairy',
      ],
      foodExclusions: [],
      motivation: Motivation.SUSTAINABILITY_KNOWLEDGE,
      dailyTimeCommitmentMinutes: 15,
      showNutriScore: true,
      avoidUpf: true,
    },
    settings: {
      notificationsEnabled: false,
      notificationPreferredTime: '10:00',
    },
    weeklyMeatConsumption: WeeklyMeatRange.FIVE_TO_NINE,
    weeklyBeefConsumption: WeeklyBeefFrequency.LESS_THAN_ONCE_PER_WEEK,
    weeklyFoodWaste: WeeklyFoodWasteRange.ONE_TO_TWO,
    weeklyUpfConsumption: WeeklyUpfRange.FOUR_TO_NINE,
    weeklyReusableOrRefill: WeeklyReusableRange.TEN_PLUS,
    lastLoginAt: new Date(),
  },
];

function gamificationFieldsFromSeed(userInfo: UserSeedData) {
  return {
    weeklyMeatConsumption: userInfo.weeklyMeatConsumption,
    weeklyBeefConsumption: userInfo.weeklyBeefConsumption,
    weeklyFoodWaste: userInfo.weeklyFoodWaste,
    weeklyUpfConsumption: userInfo.weeklyUpfConsumption,
    weeklyReusableOrRefill: userInfo.weeklyReusableOrRefill,
    segment: resolveSeedSegment(userInfo),
    currentQuestId: userInfo.currentQuestId,
    lastLoginAt: userInfo.lastLoginAt,
    ...(userInfo.settings !== undefined
      ? { settings: userInfo.settings as object }
      : {}),
  };
}

export async function seedUsers(prisma: PrismaClient) {
  console.log('👥 Seeding users...');

  const users: User[] = [];

  for (const userInfo of userData) {
    const gamification = gamificationFieldsFromSeed(userInfo);

    // Match by email first so re-seed updates the row created by a real Keycloak
    // login (sub may differ from KEYCLOAK_DEV_USER_IDS). Fall back to keycloakId.
    const existing =
      (await prisma.user.findUnique({ where: { email: userInfo.email } })) ??
      (await prisma.user.findUnique({
        where: { keycloakId: userInfo.keycloakId },
      }));

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            email: userInfo.email,
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            // Keep the live Keycloak sub if this row was created via login.
            ...gamification,
            ...(userInfo.preferences !== undefined
              ? { preferences: userInfo.preferences as object }
              : {}),
          },
        })
      : await prisma.user.create({
          data: {
            keycloakId: userInfo.keycloakId,
            email: userInfo.email,
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            ...gamification,
            ...(userInfo.preferences !== undefined
              ? { preferences: userInfo.preferences as object }
              : {}),
          },
        });

    users.push(user);

    if (user.segment) {
      await seedSustainabilityWheels(prisma, user.id, user.segment);
    }
  }

  console.log(`✅ Created/updated ${users.length} users with preferences`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      'ℹ️  Named users are matched by email on re-seed (Keycloak `sub` is preserved when already set).',
    );
  }
  const generated: User[] = [];

  const firstNames = [
    'Alex',
    'Sam',
    'Jordan',
    'Taylor',
    'Casey',
    'Jamie',
    'Morgan',
    'Riley',
    'Cameron',
    'Drew',
    'Avery',
    'Quinn',
    'Parker',
    'Rowan',
    'Skyler',
    'Robin',
    'Devon',
    'Elliot',
    'Frank',
    'Grace',
    'Hannah',
    'Ivy',
    'Jack',
    'Kara',
  ];
  const lastNames = [
    'Miller',
    'Anderson',
    'Thomas',
    'Jackson',
    'White',
    'Harris',
    'Martin',
    'Thompson',
    'Garcia',
    'Martinez',
    'Robinson',
    'Clark',
    'Rodriguez',
    'Lewis',
    'Lee',
    'Walker',
  ];
  const countries = [
    'GB',
    'DE',
    'FR',
    'NL',
    'SE',
    'NO',
    'DK',
    'FI',
    'ES',
    'IT',
    'PL',
    'BE',
    'CH',
    'AT',
    'IE',
    'PT',
  ];

  const regions = [
    'England',
    'Bavaria',
    'Ile-de-France',
    'North Holland',
    'Stockholm',
    'Oslo',
    'Capital Region',
    'Helsinki',
    'Catalonia',
    'Lombardy',
    'Mazovia',
    'Flanders',
    'Zurich',
    'Vienna',
    'Leinster',
    'Lisbon',
  ];

  const pad = (n: number, width = 4) => String(n).padStart(width, '0');
  const pick = <T>(values: readonly T[]): T =>
    values[cryptoRandomInt(0, values.length)];

  const genders = Object.values(Gender);
  const activityLevels = Object.values(ActivityLevel);
  const incomeLevels = Object.values(AnnualIncomeLevel);
  const educationLevels = Object.values(EducationLevel);
  const meatRanges = Object.values(WeeklyMeatRange);
  const beefFrequencies = Object.values(WeeklyBeefFrequency);
  const foodWasteRanges = Object.values(WeeklyFoodWasteRange);
  const upfRanges = Object.values(WeeklyUpfRange);
  const reusableRanges = Object.values(WeeklyReusableRange);
  const motivations = Object.values(Motivation);

  for (let i = 1; i <= 400; i++) {
    const keycloakId = `seed-user-${i}`;
    const email = `user${pad(i)}@example.com`;
    const firstName = pick(firstNames);
    const lastName = pick(lastNames);
    const country = pick(countries);
    const region = pick(regions);
    const zip = String(cryptoRandomInt(10000, 100000));
    const yearOfBirth = cryptoRandomInt(1950, 2009);
    const baselines: OnboardingBaselines = {
      weeklyMeatConsumption: pick(meatRanges),
      weeklyBeefConsumption: pick(beefFrequencies),
      weeklyFoodWaste: pick(foodWasteRanges),
      weeklyUpfConsumption: pick(upfRanges),
      weeklyReusableOrRefill: pick(reusableRanges),
    };
    // Segment derived from the baselines, same rubric as the onboarding
    // survey would use, so generated users stay internally consistent too.
    const segment = deriveUserSegment(baselines);
    const profileEnums = {
      gender: pick(genders),
      activityLevel: pick(activityLevels),
      annualIncome: pick(incomeLevels),
      educationLevel: pick(educationLevels),
      ...baselines,
      segment,
      lastLoginAt: new Date(
        Date.now() - cryptoRandomInt(0, 14) * 24 * 60 * 60 * 1000,
      ),
    };
    const preferences = {
      motivation: pick(motivations),
      dailyTimeCommitmentMinutes: pick([5, 10, 15]),
      showNutriScore: true,
      avoidUpf: cryptoRandomInt(0, 2) === 1,
      foodExclusions: [],
    };
    const settings = {
      notificationsEnabled: cryptoRandomInt(0, 2) === 1,
      notificationPreferredTime: '10:00',
    };

    try {
      const u = await prisma.user.upsert({
        where: { keycloakId },
        update: {
          email,
          firstName,
          lastName,
          yearOfBirth,
          country,
          region,
          zip,
          preferences,
          settings,
          ...profileEnums,
        },
        create: {
          keycloakId,
          email,
          firstName,
          lastName,
          yearOfBirth,
          country,
          region,
          zip,
          preferences,
          settings,
          ...profileEnums,
        },
      });

      generated.push(u);
    } catch (e) {
      console.warn(`Failed to upsert seed user ${keycloakId}:`, e);
    }
  }

  console.log(`✅ Created/updated ${generated.length} generated seed users`);

  return users.concat(generated);
}
