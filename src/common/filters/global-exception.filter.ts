import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggingService } from '../logging/logging.service';
import { BusinessException } from '../exceptions/business.exception';
import {
  extractErrorInfo,
  sanitizeErrorForClient,
  formatErrorForLogging,
  handlePrismaError,
  isServerError,
} from '../utils/error.utils';

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract error information
    const errorInfo = this.processException(exception);
    
    // Get correlation ID from request or generate one
    const correlationId = this.getCorrelationId(request);
    
    // Log the error
    this.logError(exception, errorInfo, request, correlationId);

    // Prepare response
    const errorResponse = this.buildErrorResponse(
      errorInfo,
      request.url,
      correlationId
    );

    // Send response
    response.status(errorInfo.statusCode).json(errorResponse);
  }

  private processException(exception: unknown): any {
    // Handle business exceptions
    if (exception instanceof BusinessException) {
      return extractErrorInfo(exception);
    }

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      return extractErrorInfo(exception);
    }

    // Handle Prisma errors
    if (this.isPrismaError(exception)) {
      const businessException = handlePrismaError(exception, 'unknown');
      return extractErrorInfo(businessException);
    }

    // Handle validation errors
    if (this.isValidationError(exception)) {
      return this.handleValidationError(exception);
    }

    // Handle generic errors
    return extractErrorInfo(exception);
  }

  private isPrismaError(exception: unknown): exception is { code: string } {
    return (
      exception !== null &&
      typeof exception === 'object' &&
      'code' in exception &&
      typeof (exception as any).code === 'string' &&
      (exception as any).code.startsWith('P')
    );
  }

  private isValidationError(exception: unknown): exception is { message: string[] } {
    return (
      exception !== null &&
      typeof exception === 'object' &&
      'message' in exception &&
      Array.isArray((exception as any).message)
    );
  }

  private handleValidationError(exception: any): any {
    return {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: HttpStatus.BAD_REQUEST,
      details: {
        errors: exception.message,
      },
    };
  }

  private getCorrelationId(request: Request): string {
    // Try to get correlation ID from various sources
    return (
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      this.loggingService.getCorrelationId() ||
      this.generateCorrelationId()
    );
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private logError(
    exception: unknown,
    errorInfo: any,
    request: Request,
    correlationId: string
  ): void {
    const logMessage = formatErrorForLogging(exception, 'GlobalExceptionFilter');
    
    // Set correlation ID for logging context (safely)
    try {
      this.loggingService.setCorrelationId(correlationId);
    } catch (error) {
      // Ignore CLS context errors - they don't affect functionality
    }
    
    // Set request context
    this.loggingService.setRequestContext({
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip || request.connection?.remoteAddress,
    });

    // Log based on error severity
    if (isServerError(errorInfo.statusCode)) {
      this.loggingService.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
        'GlobalExceptionFilter'
      );
    } else {
      this.loggingService.warn(logMessage, 'GlobalExceptionFilter');
    }

    // Log additional context for debugging
    this.loggingService.logWithMeta('debug', 'Exception details', {
      exceptionType: exception?.constructor?.name,
      statusCode: errorInfo.statusCode,
      errorCode: errorInfo.code,
      requestMethod: request.method,
      requestUrl: request.url,
      userAgent: request.headers['user-agent'],
      correlationId,
    });
  }

  private buildErrorResponse(
    errorInfo: any,
    path: string,
    correlationId: string
  ): any {
    const sanitizedError = sanitizeErrorForClient(
      errorInfo,
      process.env.NODE_ENV === 'development'
    );

    return {
      ...sanitizedError,
      path,
      correlationId,
    };
  }
}