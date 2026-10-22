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
import { setErrorReason } from '../middleware/logging.middleware';
import { BusinessException } from '../exceptions/business.exception';
import {
  extractErrorInfo,
  sanitizeErrorForClient,
  formatErrorForLogging,
  handlePrismaError,
  isServerError,
  generateTraceId,
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

    // Get trace ID from request or generate one
    const traceId = this.getTraceId(request);

    // Log the error
    this.logError(exception, errorInfo, traceId);
    setErrorReason(response, errorInfo.message);

    // Prepare response
    const errorResponse = this.buildErrorResponse(
      errorInfo,
      request.url,
      traceId,
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

  private isValidationError(
    exception: unknown,
  ): exception is { message: string[] } {
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

  private getTraceId(request: Request): string {
    // Try to get trace ID from various sources
    return (
      (request.headers['x-trace-id'] as string) ||
      (request as any).traceId ||
      this.loggingService.getTraceId() ||
      generateTraceId()
    );
  }

  private logError(exception: unknown, errorInfo: any, traceId: string): void {
    const logMessage = formatErrorForLogging(
      exception,
      'GlobalExceptionFilter',
    );

    // Set trace ID for logging context (safely)
    try {
      this.loggingService.setTraceId(traceId);
    } catch {
      // Ignore CLS context errors - they don't affect functionality
    }

    // Server errors get one entry with the stack. Client errors are already
    // recorded as a warn line by LoggingMiddleware; the reason is debug only.
    if (isServerError(errorInfo.statusCode)) {
      this.loggingService.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
        'GlobalExceptionFilter',
      );
    } else {
      this.loggingService.debug(logMessage, 'GlobalExceptionFilter');
    }
  }

  private buildErrorResponse(
    errorInfo: any,
    path: string,
    traceId: string,
  ): any {
    const sanitizedError = sanitizeErrorForClient(
      errorInfo,
      process.env.NODE_ENV === 'development',
    );

    return {
      ...sanitizedError,
      path,
      traceId,
    };
  }
}
