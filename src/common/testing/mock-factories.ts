import { LoggingService } from '../logging/logging.service';

/**
 * Creates a mock LoggingService for testing
 * @param overrides Optional partial mock to override specific methods
 * @returns A jest-mocked LoggingService
 */
export const createMockLoggingService = (
  overrides?: Partial<jest.Mocked<LoggingService>>,
): jest.Mocked<LoggingService> => {
  const mockLoggingService: jest.Mocked<LoggingService> = {
    getTraceId: jest.fn(),
    setTraceId: jest.fn(),
    setUserContext: jest.fn(),
    getUserContext: jest.fn().mockReturnValue({}),
    setRequestContext: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    logWithMeta: jest.fn(),
    logDatabaseOperation: jest.fn(),
    logAuthEvent: jest.fn(),
    logBusinessEvent: jest.fn(),
    logExternalApiCall: jest.fn(),
    runWithTraceId: jest.fn((_, fn) => fn()),
    runWithUserContext: jest.fn((_, __, fn) => fn()),
    ...overrides,
  } as any;

  return mockLoggingService;
};
