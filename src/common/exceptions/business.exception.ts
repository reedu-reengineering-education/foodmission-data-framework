import { HttpException, HttpStatus } from '@nestjs/common';

export interface BusinessExceptionResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path?: string;
  correlationId?: string;
  details?: any;
}

/**
 * Base business exception class
 */
export abstract class BusinessException extends HttpException {
  public readonly code: string;
  public readonly details?: any;

  constructor(
    message: string,
    code: string,
    statusCode: HttpStatus,
    details?: any,
  ) {
    super(message, statusCode);
    this.code = code;
    this.details = details;
  }

  getResponse(): BusinessExceptionResponse {
    return {
      statusCode: this.getStatus(),
      message: this.message,
      error: this.code,
      timestamp: new Date().toISOString(),
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Resource not found exception
 */
export class ResourceNotFoundException extends BusinessException {
  constructor(resource: string, identifier: string, details?: any) {
    super(
      `${resource} with identifier '${identifier}' not found`,
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      { resource, identifier, ...details },
    );
  }
}

/**
 * Resource already exists exception
 */
export class ResourceAlreadyExistsException extends BusinessException {
  constructor(resource: string, identifier: string, details?: any) {
    super(
      `${resource} with identifier '${identifier}' already exists`,
      'RESOURCE_ALREADY_EXISTS',
      HttpStatus.CONFLICT,
      { resource, identifier, ...details },
    );
  }
}

/**
 * Invalid operation exception
 */
export class InvalidOperationException extends BusinessException {
  constructor(operation: string, reason: string, details?: any) {
    super(
      `Invalid operation '${operation}': ${reason}`,
      'INVALID_OPERATION',
      HttpStatus.BAD_REQUEST,
      { operation, reason, ...details },
    );
  }
}

/**
 * Business validation exception
 */
export class BusinessValidationException extends BusinessException {
  constructor(field: string, value: any, reason: string, details?: any) {
    super(
      `Validation failed for field '${field}' with value '${value}': ${reason}`,
      'BUSINESS_VALIDATION_FAILED',
      HttpStatus.BAD_REQUEST,
      { field, value, reason, ...details },
    );
  }
}

/**
 * External service exception
 */
export class ExternalServiceException extends BusinessException {
  constructor(service: string, operation: string, reason: string, details?: any) {
    super(
      `External service '${service}' failed during '${operation}': ${reason}`,
      'EXTERNAL_SERVICE_ERROR',
      HttpStatus.SERVICE_UNAVAILABLE,
      { service, operation, reason, ...details },
    );
  }
}

/**
 * Authentication exception
 */
export class AuthenticationException extends BusinessException {
  constructor(reason: string, details?: any) {
    super(
      `Authentication failed: ${reason}`,
      'AUTHENTICATION_FAILED',
      HttpStatus.UNAUTHORIZED,
      { reason, ...details },
    );
  }
}

/**
 * Authorization exception
 */
export class AuthorizationException extends BusinessException {
  constructor(resource: string, action: string, details?: any) {
    super(
      `Access denied: insufficient permissions to ${action} ${resource}`,
      'AUTHORIZATION_FAILED',
      HttpStatus.FORBIDDEN,
      { resource, action, ...details },
    );
  }
}

/**
 * Rate limit exception
 */
export class RateLimitException extends BusinessException {
  constructor(limit: number, windowMs: number, details?: any) {
    super(
      `Rate limit exceeded: ${limit} requests per ${windowMs}ms`,
      'RATE_LIMIT_EXCEEDED',
      HttpStatus.TOO_MANY_REQUESTS,
      { limit, windowMs, ...details },
    );
  }
}

/**
 * Database operation exception
 */
export class DatabaseOperationException extends BusinessException {
  constructor(operation: string, table: string, reason: string, details?: any) {
    super(
      `Database operation '${operation}' failed on table '${table}': ${reason}`,
      'DATABASE_OPERATION_FAILED',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { operation, table, reason, ...details },
    );
  }
}

/**
 * Configuration exception
 */
export class ConfigurationException extends BusinessException {
  constructor(setting: string, reason: string, details?: any) {
    super(
      `Configuration error for '${setting}': ${reason}`,
      'CONFIGURATION_ERROR',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { setting, reason, ...details },
    );
  }
}

/**
 * Food-specific exceptions
 */
export class FoodNotFoundException extends ResourceNotFoundException {
  constructor(identifier: string) {
    super('Food', identifier);
  }
}

export class FoodCategoryNotFoundException extends ResourceNotFoundException {
  constructor(identifier: string) {
    super('Food Category', identifier);
  }
}

export class InvalidBarcodeException extends BusinessValidationException {
  constructor(barcode: string) {
    super('barcode', barcode, 'Invalid barcode format or checksum');
  }
}

export class OpenFoodFactsServiceException extends ExternalServiceException {
  constructor(operation: string, reason: string, details?: any) {
    super('OpenFoodFacts', operation, reason, details);
  }
}

/**
 * User-specific exceptions
 */
export class UserNotFoundException extends ResourceNotFoundException {
  constructor(identifier: string) {
    super('User', identifier);
  }
}

export class UserAlreadyExistsException extends ResourceAlreadyExistsException {
  constructor(identifier: string) {
    super('User', identifier);
  }
}

export class InvalidUserPreferencesException extends BusinessValidationException {
  constructor(field: string, value: any, reason: string) {
    super(field, value, reason);
  }
}

/**
 * Keycloak-specific exceptions
 */
export class KeycloakServiceException extends ExternalServiceException {
  constructor(operation: string, reason: string, details?: any) {
    super('Keycloak', operation, reason, details);
  }
}