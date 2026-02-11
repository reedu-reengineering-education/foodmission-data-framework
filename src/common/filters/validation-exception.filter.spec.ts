import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { ValidationExceptionFilter } from './validation-exception.filter';
import { LoggingService } from '../logging/logging.service';
import { createMockLoggingService } from '../testing/mock-factories';

describe('ValidationExceptionFilter', () => {
  let filter: ValidationExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;
  let mockLoggingService: jest.Mocked<LoggingService>;

  beforeEach(async () => {
    mockLoggingService = createMockLoggingService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationExceptionFilter,
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
      ],
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
    it('should handle validation pipe exceptions with array of messages', () => {
      const exception = new BadRequestException({
        message: ['name should not be empty', 'email must be an email'],
        error: 'Bad Request',
        statusCode: 400,
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
          errors: ['name should not be empty', 'email must be an email'],
        },
      });
    });

    it('should re-throw non-validation BadRequestException with string message', () => {
      const exception = new BadRequestException('Missing foo');

      expect(() => {
        filter.catch(exception, mockHost);
      }).toThrow(BadRequestException);

      // Verify the response was not sent
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should re-throw non-validation BadRequestException with object containing string message', () => {
      const exception = new BadRequestException({
        message: 'Missing foo',
        error: 'Bad Request',
        statusCode: 400,
      });

      expect(() => {
        filter.catch(exception, mockHost);
      }).toThrow(BadRequestException);

      // Verify the response was not sent
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should re-throw BadRequestException with empty array message', () => {
      const exception = new BadRequestException({
        message: [],
        error: 'Bad Request',
        statusCode: 400,
      });

      expect(() => {
        filter.catch(exception, mockHost);
      }).toThrow(BadRequestException);

      // Verify the response was not sent
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should handle validation errors with class-validator constraint format', () => {
      const exception = new BadRequestException({
        message: [
          {
            property: 'email',
            constraints: {
              isEmail: 'email must be an email',
              isNotEmpty: 'email should not be empty',
            },
          },
        ],
        error: 'Bad Request',
        statusCode: 400,
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
          ],
        },
      });
    });

    it('should generate correlation ID if not provided in headers', () => {
      const exception = new BadRequestException({
        message: ['name should not be empty'],
        error: 'Bad Request',
        statusCode: 400,
      });

      mockRequest.headers = {};

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const callArgs = mockResponse.json.mock.calls[0][0];
      expect(callArgs.correlationId).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });
});
