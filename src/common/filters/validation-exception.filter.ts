import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extract validation errors
    const validationErrors = this.formatValidationErrors(exceptionResponse);

    response.status(status).json({
      statusCode: status,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: request.headers['x-correlation-id'] || this.generateCorrelationId(),
      details: {
        errors: validationErrors,
      },
    });
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

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
