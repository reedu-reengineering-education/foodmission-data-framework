import { HttpStatus } from '@nestjs/common';
import {
  BusinessException,
  ResourceNotFoundException,
  ResourceAlreadyExistsException,
  InvalidOperationException,
  BusinessValidationException,
  ExternalServiceException,
  AuthenticationException,
  AuthorizationException,
  RateLimitException,
  DatabaseOperationException,
  ConfigurationException,
  FoodNotFoundException,
  UserNotFoundException,
  OpenFoodFactsServiceException,
  KeycloakServiceException,
} from './business.exception';

describe('BusinessException', () => {
  class TestBusinessException extends BusinessException {
    constructor(message: string, details?: any) {
      super(message, 'TEST_ERROR', HttpStatus.BAD_REQUEST, details);
    }
  }

  describe('BusinessException base class', () => {
    it('should create a business exception with correct properties', () => {
      const details = { field: 'test', value: 123 };
      const exception = new TestBusinessException('Test error message', details);

      expect(exception.message).toBe('Test error message');
      expect(exception.code).toBe('TEST_ERROR');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.details).toEqual(details);
    });

    it('should generate correct response format', () => {
      const details = { field: 'test' };
      const exception = new TestBusinessException('Test message', details);
      const response = exception.getResponse();

      expect(response).toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Test message',
        error: 'TEST_ERROR',
        details,
      });
      expect(response.timestamp).toBeDefined();
      expect(new Date(response.timestamp)).toBeInstanceOf(Date);
    });

    it('should work without details', () => {
      const exception = new TestBusinessException('Test message');
      const response = exception.getResponse();

      expect(response).toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Test message',
        error: 'TEST_ERROR',
      });
      expect(response.details).toBeUndefined();
    });
  });

  describe('ResourceNotFoundException', () => {
    it('should create exception with correct message and details', () => {
      const exception = new ResourceNotFoundException('User', '123');

      expect(exception.message).toBe("User with identifier '123' not found");
      expect(exception.code).toBe('RESOURCE_NOT_FOUND');
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.details).toEqual({
        resource: 'User',
        identifier: '123',
      });
    });

    it('should include additional details', () => {
      const additionalDetails = { reason: 'Database error' };
      const exception = new ResourceNotFoundException('Product', 'abc', additionalDetails);

      expect(exception.details).toEqual({
        resource: 'Product',
        identifier: 'abc',
        reason: 'Database error',
      });
    });
  });

  describe('ResourceAlreadyExistsException', () => {
    it('should create exception with correct message and details', () => {
      const exception = new ResourceAlreadyExistsException('Email', 'test@example.com');

      expect(exception.message).toBe("Email with identifier 'test@example.com' already exists");
      expect(exception.code).toBe('RESOURCE_ALREADY_EXISTS');
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.details).toEqual({
        resource: 'Email',
        identifier: 'test@example.com',
      });
    });
  });

  describe('InvalidOperationException', () => {
    it('should create exception with correct message and details', () => {
      const exception = new InvalidOperationException('delete', 'Resource is in use');

      expect(exception.message).toBe("Invalid operation 'delete': Resource is in use");
      expect(exception.code).toBe('INVALID_OPERATION');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.details).toEqual({
        operation: 'delete',
        reason: 'Resource is in use',
      });
    });
  });

  describe('BusinessValidationException', () => {
    it('should create exception with correct message and details', () => {
      const exception = new BusinessValidationException('email', 'invalid-email', 'Must be valid email format');

      expect(exception.message).toBe("Validation failed for field 'email' with value 'invalid-email': Must be valid email format");
      expect(exception.code).toBe('BUSINESS_VALIDATION_FAILED');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.details).toEqual({
        field: 'email',
        value: 'invalid-email',
        reason: 'Must be valid email format',
      });
    });
  });

  describe('ExternalServiceException', () => {
    it('should create exception with correct message and details', () => {
      const exception = new ExternalServiceException('PaymentAPI', 'processPayment', 'Connection timeout');

      expect(exception.message).toBe("External service 'PaymentAPI' failed during 'processPayment': Connection timeout");
      expect(exception.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.details).toEqual({
        service: 'PaymentAPI',
        operation: 'processPayment',
        reason: 'Connection timeout',
      });
    });
  });

  describe('AuthenticationException', () => {
    it('should create exception with correct message and details', () => {
      const exception = new AuthenticationException('Invalid credentials');

      expect(exception.message).toBe('Authentication failed: Invalid credentials');
      expect(exception.code).toBe('AUTHENTICATION_FAILED');
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(exception.details).toEqual({
        reason: 'Invalid credentials',
      });
    });
  });

  describe('AuthorizationException', () => {
    it('should create exception with correct message and details', () => {
      const exception = new AuthorizationException('user profile', 'update');

      expect(exception.message).toBe('Access denied: insufficient permissions to update user profile');
      expect(exception.code).toBe('AUTHORIZATION_FAILED');
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.details).toEqual({
        resource: 'user profile',
        action: 'update',
      });
    });
  });

  describe('RateLimitException', () => {
    it('should create exception with correct message and details', () => {
      const exception = new RateLimitException(100, 60000);

      expect(exception.message).toBe('Rate limit exceeded: 100 requests per 60000ms');
      expect(exception.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(exception.details).toEqual({
        limit: 100,
        windowMs: 60000,
      });
    });
  });

  describe('DatabaseOperationException', () => {
    it('should create exception with correct message and details', () => {
      const exception = new DatabaseOperationException('INSERT', 'users', 'Unique constraint violation');

      expect(exception.message).toBe("Database operation 'INSERT' failed on table 'users': Unique constraint violation");
      expect(exception.code).toBe('DATABASE_OPERATION_FAILED');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.details).toEqual({
        operation: 'INSERT',
        table: 'users',
        reason: 'Unique constraint violation',
      });
    });
  });

  describe('ConfigurationException', () => {
    it('should create exception with correct message and details', () => {
      const exception = new ConfigurationException('DATABASE_URL', 'Environment variable not set');

      expect(exception.message).toBe("Configuration error for 'DATABASE_URL': Environment variable not set");
      expect(exception.code).toBe('CONFIGURATION_ERROR');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.details).toEqual({
        setting: 'DATABASE_URL',
        reason: 'Environment variable not set',
      });
    });
  });

  describe('Domain-specific exceptions', () => {
    describe('FoodNotFoundException', () => {
      it('should create food-specific not found exception', () => {
        const exception = new FoodNotFoundException('123');

        expect(exception.message).toBe("Food with identifier '123' not found");
        expect(exception.code).toBe('RESOURCE_NOT_FOUND');
        expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      });
    });

    describe('UserNotFoundException', () => {
      it('should create user-specific not found exception', () => {
        const exception = new UserNotFoundException('user-456');

        expect(exception.message).toBe("User with identifier 'user-456' not found");
        expect(exception.code).toBe('RESOURCE_NOT_FOUND');
        expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      });
    });

    describe('OpenFoodFactsServiceException', () => {
      it('should create OpenFoodFacts-specific service exception', () => {
        const exception = new OpenFoodFactsServiceException('searchProduct', 'API rate limit exceeded');

        expect(exception.message).toBe("External service 'OpenFoodFacts' failed during 'searchProduct': API rate limit exceeded");
        expect(exception.code).toBe('EXTERNAL_SERVICE_ERROR');
        expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      });
    });

    describe('KeycloakServiceException', () => {
      it('should create Keycloak-specific service exception', () => {
        const exception = new KeycloakServiceException('validateToken', 'Token validation failed');

        expect(exception.message).toBe("External service 'Keycloak' failed during 'validateToken': Token validation failed");
        expect(exception.code).toBe('EXTERNAL_SERVICE_ERROR');
        expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      });
    });
  });
});