/**
 * Global test setup configuration
 * This file is executed before all tests
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods in tests to reduce noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
global.testUtils = {
  // Helper to create mock dates
  createMockDate: function(dateString) {
    return dateString ? new Date(dateString) : new Date('2024-01-01T00:00:00.000Z');
  },
  
  // Helper to create mock user
  createMockUser: function(overrides) {
    overrides = overrides || {};
    return Object.assign({
      id: 'test-user-id',
      keycloakId: 'test-keycloak-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    }, overrides);
  },
  
  // Helper to create mock food
  createMockFood: function(overrides) {
    overrides = overrides || {};
    return Object.assign({
      id: 'test-food-id',
      name: 'Test Food',
      description: 'Test Description',
      barcode: 'TEST123456',
      openFoodFactsId: null,
      categoryId: 'test-category-id',
      createdBy: 'test-user-id',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    }, overrides);
  },
  
  // Helper to create mock category
  createMockCategory: function(overrides) {
    overrides = overrides || {};
    return Object.assign({
      id: 'test-category-id',
      name: 'Test Category',
      description: 'Test Category Description',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    }, overrides);
  },
};

// Extend Jest matchers
expect.extend({
  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },
  
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
});

// Declare global types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDate(): R;
      toBeValidUUID(): R;
    }
  }
  
  var testUtils: {
    createMockDate: (dateString?: string) => Date;
    createMockUser: (overrides?: any) => any;
    createMockFood: (overrides?: any) => any;
    createMockCategory: (overrides?: any) => any;
  };
}