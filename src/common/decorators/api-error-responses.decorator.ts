import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../dto/api-response.dto';

/**
 * Options for common error responses decorator
 */
export interface ApiCommonErrorResponsesOptions {
  /** Include 400 Bad Request (validation errors) */
  badRequest?: boolean;
  /** Include 401 Unauthorized */
  unauthorized?: boolean;
  /** Include 403 Forbidden */
  forbidden?: boolean;
  /** Include 404 Not Found */
  notFound?: boolean;
  /** Include 409 Conflict */
  conflict?: boolean;
  /** Include 422 Unprocessable Entity */
  unprocessableEntity?: boolean;
  /** Include 429 Too Many Requests */
  tooManyRequests?: boolean;
  /** Include 500 Internal Server Error */
  internalServerError?: boolean;
  /** Custom error responses */
  custom?: Array<{
    status: number;
    description: string;
    example?: any;
  }>;
}

/**
 * Decorator to add common error responses to an endpoint
 * 
 * @example
 * ```typescript
 * @Post()
 * @ApiCommonErrorResponses({ badRequest: true, unauthorized: true })
 * async create(@Body() dto: CreateDto) { ... }
 * ```
 */
export function ApiCommonErrorResponses(
  options: ApiCommonErrorResponsesOptions = {},
) {
  const {
    badRequest = true,
    unauthorized = true,
    forbidden = false,
    notFound = false,
    conflict = false,
    unprocessableEntity = false,
    tooManyRequests = false,
    internalServerError = false,
    custom = [],
  } = options;

  const decorators: Array<ReturnType<typeof ApiResponse>> = [];

  if (badRequest) {
    decorators.push(
      ApiResponse({
        status: 400,
        description: 'Bad Request - Invalid input data or validation failed',
        type: ApiErrorResponseDto,
      }),
    );
  }

  if (unauthorized) {
    decorators.push(
      ApiResponse({
        status: 401,
        description: 'Unauthorized - Authentication required or invalid token',
        type: ApiErrorResponseDto,
      }),
    );
  }

  if (forbidden) {
    decorators.push(
      ApiResponse({
        status: 403,
        description: 'Forbidden - Insufficient permissions',
        type: ApiErrorResponseDto,
      }),
    );
  }

  if (notFound) {
    decorators.push(
      ApiResponse({
        status: 404,
        description: 'Not Found - Resource does not exist',
        type: ApiErrorResponseDto,
      }),
    );
  }

  if (conflict) {
    decorators.push(
      ApiResponse({
        status: 409,
        description: 'Conflict - Resource already exists or state conflict',
        type: ApiErrorResponseDto,
      }),
    );
  }

  if (unprocessableEntity) {
    decorators.push(
      ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Request is well-formed but semantically incorrect',
        type: ApiErrorResponseDto,
      }),
    );
  }

  if (tooManyRequests) {
    decorators.push(
      ApiResponse({
        status: 429,
        description: 'Too Many Requests - Rate limit exceeded',
        type: ApiErrorResponseDto,
      }),
    );
  }

  if (internalServerError) {
    decorators.push(
      ApiResponse({
        status: 500,
        description: 'Internal Server Error - An unexpected error occurred',
        type: ApiErrorResponseDto,
      }),
    );
  }

  // Add custom error responses
  custom.forEach((error) => {
    decorators.push(
      ApiResponse({
        status: error.status,
        description: error.description,
        type: ApiErrorResponseDto,
      }),
    );
  });

  return applyDecorators(...decorators);
}

/**
 * Shorthand decorator for authenticated endpoints (includes 400, 401, 403)
 */
export function ApiAuthenticatedErrorResponses() {
  return ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
  });
}

/**
 * Shorthand decorator for CRUD endpoints (includes 400, 401, 403, 404, 409)
 */
export function ApiCrudErrorResponses() {
  return ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
    notFound: true,
    conflict: true,
  });
}

