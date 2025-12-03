import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../dto/api-response.dto';

export interface ApiCommonErrorResponsesOptions {
  badRequest?: boolean;
  unauthorized?: boolean;
  forbidden?: boolean;
  notFound?: boolean;
  conflict?: boolean;
  unprocessableEntity?: boolean;
  tooManyRequests?: boolean;
  internalServerError?: boolean;
  custom?: Array<{
    status: number;
    description: string;
    example?: any;
  }>;
}

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
        description:
          'Unprocessable Entity - Request is well-formed but semantically incorrect',
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

export function ApiAuthenticatedErrorResponses() {
  return ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
  });
}

export function ApiCrudErrorResponses() {
  return ApiCommonErrorResponses({
    badRequest: true,
    unauthorized: true,
    forbidden: true,
    notFound: true,
    conflict: true,
  });
}
