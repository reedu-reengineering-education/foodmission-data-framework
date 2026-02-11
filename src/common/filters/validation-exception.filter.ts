import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggingService } from '../logging/logging.service';
import { generateCorrelationId } from '../utils/error.utils';

@Injectable()
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {}

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const exceptionResponse = exception.getResponse();

    // Only handle validation pipe exceptions (those with array of validation messages)
    // Let other BadRequestExceptions fall through to global exception handler
    if (!this.isValidationPipeException(exceptionResponse)) {
      throw exception;
    }

    const status = exception.getStatus();

    // Extract validation errors
    const validationErrors = this.formatValidationErrors(exceptionResponse);

    // Get correlation ID from various sources, consistent with GlobalExceptionFilter
    const correlationId = this.getCorrelationId(request);

    response.status(status).json({
      statusCode: status,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
      details: {
        errors: validationErrors,
      },
    });
  }

  private isValidationPipeException(exceptionResponse: any): boolean {
    // ValidationPipe exceptions have a specific structure:
    // - response is an object with a 'message' property
    // - the 'message' property is an array of strings (validation errors)
    return (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse &&
      Array.isArray(exceptionResponse.message) &&
      exceptionResponse.message.length > 0
    );
  }

  private formatValidationErrors(exceptionResponse: any): string[] {
    if (typeof exceptionResponse === 'string') {
      return [exceptionResponse];
    }

    if (Array.isArray(exceptionResponse.message)) {
      return exceptionResponse.message.map((error: any) => {
        if (typeof error === 'string') {
          return error;
        }

        // Handle class-validator error format
        if (error.constraints) {
          const field = error.property;
          const constraints = Object.values(error.constraints);
          return constraints.map((msg: any) => `${field}: ${msg}`).join(', ');
        }

        return JSON.stringify(error);
      });
    }

    if (exceptionResponse.message) {
      return Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message
        : [exceptionResponse.message];
    }

    return ['Validation failed'];
  }

  private getCorrelationId(request: Request): string {
    // Try to get correlation ID from various sources, matching GlobalExceptionFilter logic
    return (
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      (request as any).correlationId ||
      this.loggingService.getCorrelationId() ||
      generateCorrelationId()
    );
  }
}
