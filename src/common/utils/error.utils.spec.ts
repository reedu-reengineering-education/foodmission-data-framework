import { HttpStatus } from '@nestjs/common';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import {
  handlePrismaError,
  extractErrorInfo,
  isClientError,
  isServerError,
  sanitizeErrorForClient,
  generateCorrelationId,
  formatErrorForLogging,
  isRetryableError,
  getUserFriendlyMessage,
  ERROR_CODES,
} from './error.utils';
import {
  BusinessException,
  ResourceNotFoundException,
  ResourceAlreadyExistsException,
  DatabaseOperationException,
} from '../exceptions/business.exception';

describe('ErrorUtils', () => {
  describe('handlePrismaError', () => {
    it('should handle unique constraint violation', () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: ERROR_CODES.PRISMA_UNIQUE_CONSTRAINT,
          clientVersion: '4.0.0',
          meta: { target: ['email'] },
        }
      );

      const result = handlePrismaError(prismaError, 'CREATE', 'users');

      expect(result).toBeInstanceOf(ResourceAlreadyExistsException);
      expect(result.message).toContain('users');
      expect(result.message).toContain('email=email');
    });

    it('should handle record not found', () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Record not found',
        {
          code: ERROR_CODES.PRISMA_RECORD_NOT_FOUND,
          clientVersion: '4.0.0',
          meta: { cause: 'Record to update not found.' },
        }
      );

      const result = handlePrismaError(prismaError, 'UPDATE', 'users');

      expect(result).toBeInstanceOf(ResourceNotFoundException);
      expect(result.message).toContain('users');
    });

    it('should handle foreign key constraint violation', () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: ERROR_CODES.PRISMA_FOREIGN_KEY_CONSTRAINT,
          clientVersion: '4.0.0',
          meta: { field_name: 'categoryId' },
        }
      );

      const result = handlePrismaError(prismaError, 'CREATE', 'foods');

      expect(result).toBeInstanceOf(DatabaseOperationException);
      expect(result.message).toContain('Foreign key constraint violation');
    });

    it('should handle validation errors', () => {
      const prismaError = new PrismaClientValidationError(
        'Validation error in query',
        { clientVersion: '4.0.0' }
      );

      const result = handlePrismaError(prismaError, 'CREATE', 'users');

      expect(result).toBeInstanceOf(DatabaseOperationException);
      expect(result.message).toContain('Validation error in database query');
    });

    it('should handle unknown Prisma errors', () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Unknown error',
        {
          code: 'P9999',
          clientVersion: '4.0.0',
          meta: {},
        }
      );

      const result = handlePrismaError(prismaError, 'SELECT', 'users');

      expect(result).toBeInstanceOf(DatabaseOperationException);
      expect(result.message).toContain('Prisma error');
    });

    it('should handle non-Prisma errors', () => {
      const genericError = new Error('Generic database error');

      const result = handlePrismaError(genericError, 'SELECT', 'users');

      expect(result).toBeInstanceOf(DatabaseOperationException);
      expect(result.message).toContain('Generic database error');
    });
  });

  describe('extractErrorInfo', () => {
    it('should extract info from business exceptions', () => {
      const exception = new ResourceNotFoundException('User', '123');
      const info = extractErrorInfo(exception);

      expect(info).toEqual({
        message: "User with identifier '123' not found",
        code: 'RESOURCE_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
        details: { resource: 'User', identifier: '123' },
        stack: exception.stack,
      });
    });

    it('should extract info from HTTP exceptions', () => {
      const exception = {
        status: HttpStatus.BAD_REQUEST,
        message: 'Bad request',
        name: 'BadRequestException',
        stack: 'stack trace',
      };

      const info = extractErrorInfo(exception);

      expect(info).toEqual({
        message: 'Bad request',
        code: 'BadRequestException',
        statusCode: HttpStatus.BAD_REQUEST,
        stack: 'stack trace',
      });
    });

    it('should extract info from Prisma errors', () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: ERROR_CODES.PRISMA_UNIQUE_CONSTRAINT,
          clientVersion: '4.0.0',
          meta: { target: ['email'] },
        }
      );

      const info = extractErrorInfo(prismaError);

      expect(info).toEqual({
        message: 'Unique constraint failed',
        code: ERROR_CODES.PRISMA_UNIQUE_CONSTRAINT,
        statusCode: HttpStatus.BAD_REQUEST,
        details: { target: ['email'] },
        stack: prismaError.stack,
      });
    });

    it('should extract info from generic errors', () => {
      const error = new Error('Generic error');
      const info = extractErrorInfo(error);

      expect(info).toEqual({
        message: 'Generic error',
        code: 'Error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        stack: error.stack,
      });
    });

    it('should handle errors without message', () => {
      const error = {};
      const info = extractErrorInfo(error);

      expect(info).toEqual({
        message: 'Internal server error',
        code: 'UNKNOWN_ERROR',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        stack: undefined,
      });
    });
  });

  describe('isClientError', () => {
    it('should identify client errors correctly', () => {
      expect(isClientError(400)).toBe(true);
      expect(isClientError(404)).toBe(true);
      expect(isClientError(422)).toBe(true);
      expect(isClientError(499)).toBe(true);
    });

    it('should not identify non-client errors as client errors', () => {
      expect(isClientError(200)).toBe(false);
      expect(isClientError(300)).toBe(false);
      expect(isClientError(500)).toBe(false);
      expect(isClientError(399)).toBe(false);
    });
  });

  describe('isServerError', () => {
    it('should identify server errors correctly', () => {
      expect(isServerError(500)).toBe(true);
      expect(isServerError(502)).toBe(true);
      expect(isServerError(503)).toBe(true);
      expect(isServerError(599)).toBe(true);
    });

    it('should not identify non-server errors as server errors', () => {
      expect(isServerError(200)).toBe(false);
      expect(isServerError(400)).toBe(false);
      expect(isServerError(499)).toBe(false);
    });
  });

  describe('sanitizeErrorForClient', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should sanitize client errors', () => {
      const errorInfo = {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: HttpStatus.BAD_REQUEST,
        details: { field: 'email' },
        stack: 'stack trace',
      };

      const sanitized = sanitizeErrorForClient(errorInfo);

      expect(sanitized).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
        details: { field: 'email' },
      });
    });

    it('should not include details for server errors in production', () => {
      process.env.NODE_ENV = 'production';

      const errorInfo = {
        message: 'Internal error',
        code: 'INTERNAL_ERROR',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        details: { sensitive: 'data' },
        stack: 'stack trace',
      };

      const sanitized = sanitizeErrorForClient(errorInfo);

      expect(sanitized).toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal error',
        error: 'INTERNAL_ERROR',
        timestamp: expect.any(String),
      });
      expect(sanitized.details).toBeUndefined();
      expect(sanitized.stack).toBeUndefined();
    });

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';

      const errorInfo = {
        message: 'Error',
        code: 'ERROR',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        stack: 'stack trace',
      };

      const sanitized = sanitizeErrorForClient(errorInfo, true);

      expect(sanitized.stack).toBe('stack trace');
    });
  });

  describe('generateCorrelationId', () => {
    it('should generate a correlation ID', () => {
      const id = generateCorrelationId();

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('formatErrorForLogging', () => {
    it('should format error for logging', () => {
      const error = new ResourceNotFoundException('User', '123');
      const formatted = formatErrorForLogging(error, 'TestContext');

      expect(formatted).toBe("[TestContext] RESOURCE_NOT_FOUND: User with identifier '123' not found");
    });

    it('should format error without context', () => {
      const error = new Error('Test error');
      const formatted = formatErrorForLogging(error);

      expect(formatted).toBe('Error: Test error');
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable server errors', () => {
      const error = { status: 503, message: 'Service unavailable' };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should not retry client errors', () => {
      const error = { status: 400, message: 'Bad request' };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should identify retryable network errors', () => {
      const error = { code: 'ECONNRESET', message: 'Connection reset' };
      expect(isRetryableError(error)).toBe(true);

      const timeoutError = { code: 'ETIMEDOUT', message: 'Timeout' };
      expect(isRetryableError(timeoutError)).toBe(true);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return friendly message for known error codes', () => {
      const error = new ResourceNotFoundException('User', '123');
      const message = getUserFriendlyMessage(error);

      expect(message).toBe('The requested item could not be found.');
    });

    it('should return generic message for unknown error codes', () => {
      const error = new Error('Unknown error');
      const message = getUserFriendlyMessage(error);

      expect(message).toBe('An unexpected error occurred. Please try again.');
    });
  });
});