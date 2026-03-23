import {
  ActivityLevel,
  AnnualIncomeLevel,
  EducationLevel,
  Gender,
  PrismaClient,
  User,
} from '@prisma/client';

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
    keycloakId: 'dev-user-1',
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
    keycloakId: 'dev-user-2',
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
    keycloakId: 'dev-user-3',
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
    keycloakId: 'dev-user-4',
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
    keycloakId: 'admin-user-1',
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

  const randomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const pad = (n: number, width = 4) => String(n).padStart(width, '0');
  const pick = <T>(values: readonly T[]): T =>
    values[Math.floor(Math.random() * values.length)];

  const genders = Object.values(Gender);
  const activityLevels = Object.values(ActivityLevel);
  const incomeLevels = Object.values(AnnualIncomeLevel);
  const educationLevels = Object.values(EducationLevel);

  for (let i = 1; i <= 400; i++) {
    const keycloakId = `seed-user-${i}`;
    const email = `user${pad(i)}@example.com`;
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const country = countries[Math.floor(Math.random() * countries.length)];
    const region = regions[Math.floor(Math.random() * regions.length)];
    const zip = String(randomInt(10000, 99999));
    const yearOfBirth = randomInt(1950, 2008);
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
