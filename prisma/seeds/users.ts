import { PrismaClient, User } from '@prisma/client';

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
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
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
    email: 'admin@foodmission.com',
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

    // Update user with preferences if provided
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
  return users;
}
