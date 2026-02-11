import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { LoggingService } from '../logging/logging.service';
import { ResourceNotFoundException } from '../exceptions/business.exception';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { createMockLoggingService } from '../testing/mock-factories';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let loggingService: jest.Mocked<LoggingService>;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(async () => {
    const mockLoggingService = createMockLoggingService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalExceptionFilter,
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
      ],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
    loggingService = module.get(LoggingService);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      headers: {
        'user-agent': 'test-agent',
        'x-correlation-id': 'test-correlation-id',
      },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  describe('catch', () => {
    it('should handle business exceptions', () => {
      const exception = new ResourceNotFoundException('User', '123');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message: "User with identifier '123' not found",
        error: 'RESOURCE_NOT_FOUND',
        timestamp: expect.any(String),
        path: '/api/test',
        correlationId: 'test-correlation-id',
        details: {
          resource: 'User',
          identifier: '123',
        },
      });
    });

    it('should handle HTTP exceptions', () => {
      const exception = new HttpException(
        'Bad Request',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Bad Request',
        error: 'HttpException',
        timestamp: expect.any(String),
        path: '/api/test',
        correlationId: 'test-correlation-id',
      });
    });

    it('should handle Prisma errors', () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
          meta: { target: ['email'] },
        },
      );

      filter.catch(prismaError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(loggingService.warn).toHaveBeenCalled();
    });

    it('should handle validation errors', () => {
      const validationError = {
        message: ['email must be a valid email', 'name should not be empty'],
      };

      filter.catch(validationError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
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

    it('should handle generic errors', () => {
      const genericError = new Error('Something went wrong');

      filter.catch(genericError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Something went wrong',
        error: 'Error',
        timestamp: expect.any(String),
        path: '/api/test',
        correlationId: 'test-correlation-id',
      });
    });

    it('should generate correlation ID if not present', () => {
      mockRequest.headers = {};
      loggingService.getCorrelationId.mockReturnValue(undefined);

      const exception = new Error('Test error');
      filter.catch(exception, mockHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.correlationId).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it('should use correlation ID from logging service', () => {
      mockRequest.headers = {};
      loggingService.getCorrelationId.mockReturnValue('service-correlation-id');

      const exception = new Error('Test error');
      filter.catch(exception, mockHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.correlationId).toBe('service-correlation-id');
    });

    it('should use x-request-id header as correlation ID', () => {
      mockRequest.headers = { 'x-request-id': 'request-id-123' };

      const exception = new Error('Test error');
      filter.catch(exception, mockHost);

      const responseCall = mockResponse.json.mock.calls[0][0];
      expect(responseCall.correlationId).toBe('request-id-123');
    });

    it('should log server errors as errors', () => {
      const serverError = new Error('Internal server error');

      filter.catch(serverError, mockHost);

      expect(loggingService.error).toHaveBeenCalledWith(
        '[GlobalExceptionFilter] Error: Internal server error',
        serverError.stack,
        'GlobalExceptionFilter',
      );
    });

    it('should log client errors as warnings', () => {
      const clientError = new HttpException(
        'Bad Request',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(clientError, mockHost);

      expect(loggingService.warn).toHaveBeenCalledWith(
        '[GlobalExceptionFilter] HttpException: Bad Request',
        'GlobalExceptionFilter',
      );
    });

    it('should set request context in logging service', () => {
      const exception = new Error('Test error');

      filter.catch(exception, mockHost);

      expect(loggingService.setCorrelationId).toHaveBeenCalledWith(
        'test-correlation-id',
      );
      expect(loggingService.setRequestContext).toHaveBeenCalledWith({
        method: 'GET',
        url: '/api/test',
        userAgent: 'test-agent',
        ip: '127.0.0.1',
      });
    });

    it('should log debug information', () => {
      const exception = new ResourceNotFoundException('User', '123');

      filter.catch(exception, mockHost);

      expect(loggingService.logWithMeta).toHaveBeenCalledWith(
        'debug',
        'Exception details',
        {
          exceptionType: 'ResourceNotFoundException',
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'RESOURCE_NOT_FOUND',
          requestMethod: 'GET',
          requestUrl: '/api/test',
          userAgent: 'test-agent',
          correlationId: 'test-correlation-id',
        },
      );
    });

    it('should handle missing request properties gracefully', () => {
      mockRequest = {
        url: '/api/test',
        method: 'GET',
        headers: {},
      };

      mockHost.switchToHttp = jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      });

      const exception = new Error('Test error');

      expect(() => filter.catch(exception, mockHost)).not.toThrow();
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });
  });
});
