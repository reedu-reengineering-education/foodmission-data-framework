import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { ValidationExceptionFilter } from './validation-exception.filter';

describe('ValidationExceptionFilter', () => {
  let filter: ValidationExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationExceptionFilter],
    }).compile();

    filter = module.get<ValidationExceptionFilter>(ValidationExceptionFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'POST',
      headers: {
        'x-correlation-id': 'test-correlation-id',
      },
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  describe('catch', () => {
    it('should handle BadRequestException with array of string messages', () => {
      const exception = new BadRequestException([
        'email must be a valid email',
        'name should not be empty',
      ]);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
        path: '/api/test',
        correlationId: 'test-correlation-id',
        details: {
          errors: ['email must be a valid email', 'name should not be empty'],
        },
      });
    });

    it('should handle BadRequestException with class-validator error format', () => {
      const validationErrors = [
        {
          property: 'email',
          constraints: {
            isEmail: 'email must be an email',
            isNotEmpty: 'email should not be empty',
          },
        },
        {
          property: 'age',
          constraints: {
            isNumber: 'age must be a number',
          },
        },
      ];

      const exception = new BadRequestException({
        message: validationErrors,
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
        path: '/api/test',
        correlationId: 'test-correlation-id',
        details: {
          errors: [
            'email: email must be an email, email: email should not be empty',
            'age: age must be a number',
          ],
        },
      });
    });

    it('should handle BadRequestException with simple string message', () => {
      const exception = new BadRequestException('Invalid input');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
        path: '/api/test',
        correlationId: 'test-correlation-id',
        details: {
          errors: ['Invalid input'],
        },
      });
    });

    it('should handle BadRequestException with object containing message string', () => {
      const exception = new BadRequestException({
        message: 'Invalid data format',
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
        path: '/api/test',
        correlationId: 'test-correlation-id',
        details: {
          errors: ['Invalid data format'],
        },
      });
    });

    it('should generate correlation ID when header is not present', () => {
      mockRequest.headers = {};

      const exception = new BadRequestException('Test error');
      filter.catch(exception, mockHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.correlationId).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it('should use correlation ID from x-correlation-id header', () => {
      mockRequest.headers = { 'x-correlation-id': 'custom-correlation-id' };

      const exception = new BadRequestException('Test error');
      filter.catch(exception, mockHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.correlationId).toBe('custom-correlation-id');
    });

    it('should handle mixed error formats in array', () => {
      const validationErrors = [
        'Simple string error',
        {
          property: 'username',
          constraints: {
            minLength: 'username must be longer than or equal to 3 characters',
          },
        },
      ];

      const exception = new BadRequestException({
        message: validationErrors,
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
        path: '/api/test',
        correlationId: 'test-correlation-id',
        details: {
          errors: [
            'Simple string error',
            'username: username must be longer than or equal to 3 characters',
          ],
        },
      });
    });

    it('should handle empty validation errors array', () => {
      const exception = new BadRequestException({
        message: [],
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
        path: '/api/test',
        correlationId: 'test-correlation-id',
        details: {
          errors: [],
        },
      });
    });

    it('should handle malformed error object without constraints', () => {
      const validationErrors = [
        {
          property: 'field1',
          // No constraints property
        },
      ];

      const exception = new BadRequestException({
        message: validationErrors,
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.details.errors).toHaveLength(1);
      // Should serialize to JSON string when constraints are missing
      expect(responseCall.details.errors[0]).toContain('property');
    });

    it('should default to "Validation failed" when no message is provided', () => {
      const exception = new BadRequestException({});

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
        path: '/api/test',
        correlationId: 'test-correlation-id',
        details: {
          errors: ['Validation failed'],
        },
      });
    });

    it('should include correct timestamp format', () => {
      const exception = new BadRequestException('Test error');
      const beforeTest = new Date().toISOString();

      filter.catch(exception, mockHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      const timestamp = responseCall.timestamp;
      const afterTest = new Date().toISOString();

      // Verify timestamp is in ISO format
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      // Verify timestamp is between before and after test execution
      expect(timestamp >= beforeTest && timestamp <= afterTest).toBe(true);
    });

    it('should preserve the request path in response', () => {
      mockRequest.url = '/api/users/123/profile';

      const exception = new BadRequestException('Invalid profile data');
      filter.catch(exception, mockHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.path).toBe('/api/users/123/profile');
    });
  });
});
