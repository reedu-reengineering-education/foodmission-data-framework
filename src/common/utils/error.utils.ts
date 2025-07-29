import { HttpStatus } from '@nestjs/common';
import {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import {
  BusinessException,
  DatabaseOperationException,
  ResourceNotFoundException,
  ResourceAlreadyExistsException,
} from '../exceptions/business.exception';

/**
 * Error code mappings for different error types
 */
export const ERROR_CODES = {
  // Prisma error codes
  PRISMA_UNIQUE_CONSTRAINT: 'P2002',
  PRISMA_FOREIGN_KEY_CONSTRAINT: 'P2003',
  PRISMA_RECORD_NOT_FOUND: 'P2025',
  PRISMA_DEPENDENT_RECORD_NOT_FOUND: 'P2015',
  PRISMA_REQUIRED_FIELD_MISSING: 'P2012',
  PRISMA_VALUE_TOO_LONG: 'P2000',
  PRISMA_INVALID_VALUE: 'P2006',

  // HTTP error codes
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Extract meaningful error information from various error types
 */
export interface ErrorInfo {
  message: string;
  code: string;
  statusCode: HttpStatus;
  details?: any;
  stack?: string;
}

/**
 * Convert Prisma errors to business exceptions
 */
export function handlePrismaError(
  error: any,
  operation: string,
  table?: string,
): BusinessException {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case ERROR_CODES.PRISMA_UNIQUE_CONSTRAINT:
        const target = error.meta?.target as string[] | undefined;
        const field = target?.[0] || 'unknown';
        return new ResourceAlreadyExistsException(
          table || 'Resource',
          `${field}=${error.meta?.target}`,
          { prismaCode: error.code, field, target },
        );

      case ERROR_CODES.PRISMA_RECORD_NOT_FOUND:
        return new ResourceNotFoundException(table || 'Resource', 'unknown', {
          prismaCode: error.code,
          cause: error.meta?.cause,
        });

      case ERROR_CODES.PRISMA_FOREIGN_KEY_CONSTRAINT:
        return new DatabaseOperationException(
          operation,
          table || 'unknown',
          'Foreign key constraint violation',
          { prismaCode: error.code, field: error.meta?.field_name },
        );

      case ERROR_CODES.PRISMA_REQUIRED_FIELD_MISSING:
        return new DatabaseOperationException(
          operation,
          table || 'unknown',
          `Required field missing: ${error.meta?.field_name}`,
          { prismaCode: error.code, field: error.meta?.field_name },
        );

      case ERROR_CODES.PRISMA_VALUE_TOO_LONG:
        return new DatabaseOperationException(
          operation,
          table || 'unknown',
          'Value too long for database field',
          { prismaCode: error.code, column: error.meta?.column_name },
        );

      default:
        return new DatabaseOperationException(
          operation,
          table || 'unknown',
          `Prisma error: ${error.message}`,
          { prismaCode: error.code, meta: error.meta },
        );
    }
  }

  if (error instanceof PrismaClientValidationError) {
    return new DatabaseOperationException(
      operation,
      table || 'unknown',
      'Validation error in database query',
      { type: 'PrismaClientValidationError', originalMessage: error.message },
    );
  }

  if (error instanceof PrismaClientUnknownRequestError) {
    return new DatabaseOperationException(
      operation,
      table || 'unknown',
      'Unknown database error',
      {
        type: 'PrismaClientUnknownRequestError',
        originalMessage: error.message,
      },
    );
  }

  // If it's not a Prisma error, wrap it as a generic database error
  return new DatabaseOperationException(
    operation,
    table || 'unknown',
    error.message || 'Unknown database error',
    { type: error.constructor.name, originalError: error },
  );
}

/**
 * Extract error information from any error type
 */
export function extractErrorInfo(error: any): ErrorInfo {
  // Business exceptions
  if (error instanceof BusinessException) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.getStatus(),
      details: error.details,
      stack: error.stack,
    };
  }

  // HTTP exceptions
  if (error.status && error.message) {
    return {
      message: error.message,
      code: error.name || 'HTTP_ERROR',
      statusCode: error.status,
      stack: error.stack,
    };
  }

  // Prisma errors
  if (error instanceof PrismaClientKnownRequestError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: HttpStatus.BAD_REQUEST,
      details: error.meta,
      stack: error.stack,
    };
  }

  // Generic errors
  return {
    message: error.message || 'Internal server error',
    code: error.name || 'UNKNOWN_ERROR',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    stack: error.stack,
  };
}

/**
 * Check if an error is a client error (4xx)
 */
export function isClientError(statusCode: number): boolean {
  return statusCode >= 400 && statusCode < 500;
}

/**
 * Check if an error is a server error (5xx)
 */
export function isServerError(statusCode: number): boolean {
  return statusCode >= 500;
}

/**
 * Sanitize error details for client response
 */
export function sanitizeErrorForClient(
  error: ErrorInfo,
  includeStack: boolean = false,
): any {
  const sanitized: any = {
    statusCode: error.statusCode,
    message: error.message,
    error: error.code,
    timestamp: new Date().toISOString(),
  };

  // Only include details for client errors or in development
  if (
    isClientError(error.statusCode) ||
    process.env.NODE_ENV === 'development'
  ) {
    if (error.details) {
      sanitized.details = error.details;
    }
  }

  // Only include stack trace in development
  if (includeStack && process.env.NODE_ENV === 'development' && error.stack) {
    sanitized.stack = error.stack;
  }

  return sanitized;
}

/**
 * Create a correlation ID for error tracking
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Format error message for logging
 */
export function formatErrorForLogging(error: any, context?: string): string {
  const errorInfo = extractErrorInfo(error);
  const contextStr = context ? `[${context}] ` : '';
  return `${contextStr}${errorInfo.code}: ${errorInfo.message}`;
}

/**
 * Check if error should be retried
 */
export function isRetryableError(error: any): boolean {
  const errorInfo = extractErrorInfo(error);

  // Retry server errors but not client errors
  if (isServerError(errorInfo.statusCode)) {
    return true;
  }

  // Retry specific network/timeout errors
  const retryableCodes = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
  ];

  return retryableCodes.includes(errorInfo.code);
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: any): string {
  const errorInfo = extractErrorInfo(error);

  // Map technical errors to user-friendly messages
  const friendlyMessages: Record<string, string> = {
    RESOURCE_NOT_FOUND: 'The requested item could not be found.',
    RESOURCE_ALREADY_EXISTS: 'This item already exists.',
    AUTHENTICATION_FAILED: 'Please check your login credentials.',
    AUTHORIZATION_FAILED: 'You do not have permission to perform this action.',
    BUSINESS_VALIDATION_FAILED: 'Please check your input and try again.',
    EXTERNAL_SERVICE_ERROR:
      'An external service is currently unavailable. Please try again later.',
    DATABASE_OPERATION_FAILED: 'A database error occurred. Please try again.',
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait before trying again.',
  };

  return (
    friendlyMessages[errorInfo.code] ||
    'An unexpected error occurred. Please try again.'
  );
}
