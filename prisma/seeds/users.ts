import {
  ActivityLevel,
  AnnualIncomeLevel,
  EducationLevel,
  Gender,
  PrismaClient,
  User,
} from '@prisma/client';
import { randomInt as cryptoRandomInt } from 'crypto';
import { KEYCLOAK_DEV_USER_IDS } from './keycloak-dev-user-ids';

export interface UserSeedData {
  keycloakId: string;
  email: string;
  firstName: string;
  lastName: string;
  preferences?: {
    dietaryRestrictions: string[];
    allergies: string[];
    preferredCategories: string[];
  };
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
    },
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
    },
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
    },
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
    },
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
    },
  },
];

export async function seedUsers(prisma: PrismaClient) {
  console.log('👥 Seeding users...');

  const users: User[] = [];

  for (const userInfo of userData) {
    const user = await prisma.user.upsert({
      where: { keycloakId: userInfo.keycloakId },
      update: {
        email: userInfo.email,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
      },
      create: {
        keycloakId: userInfo.keycloakId,
        email: userInfo.email,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
      },
    });

    if (userInfo.preferences) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          preferences: userInfo.preferences,
        },
      });
    }

    users.push(user);
  }

  console.log(`✅ Created/updated ${users.length} users with preferences`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      'ℹ️  Import keycloak/foodmission-realm.dev.json into Keycloak so JWT `sub` matches User.keycloakId (see keycloak/README.md).',
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

  for (let i = 1; i <= 400; i++) {
    const keycloakId = `seed-user-${i}`;
    const email = `user${pad(i)}@example.com`;
    const firstName = pick(firstNames);
    const lastName = pick(lastNames);
    const country = pick(countries);
    const region = pick(regions);
    const zip = String(cryptoRandomInt(10000, 100000));
    const yearOfBirth = cryptoRandomInt(1950, 2009);
    const profileEnums = {
      gender: pick(genders),
      activityLevel: pick(activityLevels),
      annualIncome: pick(incomeLevels),
      educationLevel: pick(educationLevels),
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
          ...profileEnums,
        } as any,
        create: {
          keycloakId,
          email,
          firstName,
          lastName,
          yearOfBirth,
          country,
          region,
          zip,
          ...profileEnums,
        } as any,
      });

      generated.push(u);
    } catch (e) {
      console.warn(`Failed to upsert seed user ${keycloakId}:`, e);
    }
  }

  console.log(`✅ Created/updated ${generated.length} generated seed users`);

  return users.concat(generated);
}
