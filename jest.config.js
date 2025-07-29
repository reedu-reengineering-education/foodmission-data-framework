module.exports = {
  // Basic configuration
  preset: 'ts-jest',
  testEnvironment: 'node',

  // File patterns
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  // Module mocking
  moduleNameMapper: {
    '^nest-keycloak-connect$':
      '<rootDir>/test/__mocks__/nest-keycloak-connect.js',
    '^keycloak-connect$': '<rootDir>/test/__mocks__/keycloak-connect.js',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/main.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.module.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Test setup
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],

  // Test timeout
  testTimeout: 30000,

  // Roots
  roots: ['<rootDir>/src', '<rootDir>/test'],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,
};
