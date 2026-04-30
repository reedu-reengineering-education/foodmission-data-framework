import type { SeedUserInput } from './seed-helpers';

export const TEST_SEED_FOODS: ReadonlyArray<{
  name: string;
  description: string;
  barcode: string;
}> = [
  {
    name: 'Test Apple',
    description: 'Test apple for automated testing',
    barcode: 'TEST001',
  },
  {
    name: 'Test Carrot',
    description: 'Test carrot for automated testing',
    barcode: 'TEST002',
  },
  {
    name: 'Test Chicken',
    description: 'Test chicken for automated testing',
    barcode: 'TEST003',
  },
];

export const TEST_SEED_USERS: ReadonlyArray<SeedUserInput> = [
  {
    keycloakId: 'test-user-1',
    email: 'test1@test.com',
    firstName: 'Test',
    lastName: 'User1',
    preferences: {
      dietaryRestrictions: ['vegetarian'],
      allergies: ['nuts'],
    },
  },
  {
    keycloakId: 'test-user-2',
    email: 'test2@test.com',
    firstName: 'Test',
    lastName: 'User2',
    preferences: {
      dietaryRestrictions: [],
      allergies: [],
    },
  },
];

export const DEV_EXTRA_FOODS: ReadonlyArray<{
  name: string;
  description: string;
  barcode?: string;
}> = [
  {
    name: 'Test Food - No Barcode',
    description: 'Test food item without barcode for testing',
  },
  {
    name: 'Test Food - With OpenFoodFacts',
    description: 'Test food with OpenFoodFacts integration',
    barcode: '9999999999999',
  },
  {
    name: 'Test Food - Long Description',
    description:
      'This is a test food item with a very long description that should test how the system handles longer text content and ensure proper validation and display of extended descriptions in the user interface.',
    barcode: '8888888888888',
  },
];

export const DEV_EXTRA_USERS: ReadonlyArray<SeedUserInput> = [
  {
    keycloakId: 'test-user-no-prefs',
    email: 'test.noprofs@example.com',
    firstName: 'Test',
    lastName: 'NoPreferences',
  },
  {
    keycloakId: 'test-user-many-allergies',
    email: 'test.allergies@example.com',
    firstName: 'Test',
    lastName: 'ManyAllergies',
    preferences: {
      dietaryRestrictions: ['vegetarian', 'gluten-free', 'low-sodium'],
      allergies: ['nuts', 'dairy', 'eggs', 'soy', 'shellfish'],
    },
  },
];
