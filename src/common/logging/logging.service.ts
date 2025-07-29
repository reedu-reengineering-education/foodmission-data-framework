import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { createLoggerConfig, createWinstonLogger } from './logger.config';
import * as cls from 'cls-hooked';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  userEmail?: string;
  requestId?: string;
  method?: string;
  url?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

@Injectable()
export class LoggingService implements LoggerService {
  private readonly logger: winston.Logger;
  private readonly namespace = cls.createNamespace('logging');

  constructor() {
    const config = createLoggerConfig();
    this.logger = createWinstonLogger(config);
  }

  /**
   * Set correlation ID for the current request context
   */
  setCorrelationId(correlationId: string): void {
    try {
      this.namespace.set('correlationId', correlationId);
    } catch (error) {
      // Ignore CLS context errors - they don't affect functionality
    }
  }

  /**
   * Get correlation ID from the current request context
   */
  getCorrelationId(): string | undefined {
    return this.namespace.get('correlationId');
  }

  /**
   * Set user context for the current request
   */
  setUserContext(userId: string, userEmail?: string): void {
    try {
      this.namespace.set('userId', userId);
      if (userEmail) {
        this.namespace.set('userEmail', userEmail);
      }
    } catch (error) {
      // Ignore CLS context errors - they don't affect functionality
    }
  }

  /**
   * Get user context from the current request
   */
  getUserContext(): { userId?: string; userEmail?: string } {
    return {
      userId: this.namespace.get('userId'),
      userEmail: this.namespace.get('userEmail'),
    };
  }

  /**
   * Set request context for the current request
   */
  setRequestContext(context: Partial<LogContext>): void {
    try {
      Object.keys(context).forEach((key) => {
        this.namespace.set(key, context[key]);
      });
    } catch (error) {
      // Ignore CLS context errors - they don't affect functionality
    }
  }

  /**
   * Get the current context for logging
   */
  private getContext(): LogContext {
    const context: LogContext = {};

    const correlationId = this.getCorrelationId();
    if (correlationId) context.correlationId = correlationId;

    const userContext = this.getUserContext();
    if (userContext.userId) context.userId = userContext.userId;
    if (userContext.userEmail) context.userEmail = userContext.userEmail;

    // Get other context data
    const requestId = this.namespace.get('requestId');
    if (requestId) context.requestId = requestId;

    const method = this.namespace.get('method');
    if (method) context.method = method;

    const url = this.namespace.get('url');
    if (url) context.url = url;

    const userAgent = this.namespace.get('userAgent');
    if (userAgent) context.userAgent = userAgent;

    const ip = this.namespace.get('ip');
    if (ip) context.ip = ip;

    return context;
  }

  /**
   * Log an error message
   */
  error(message: string, trace?: string, context?: string): void {
    const logContext = this.getContext();
    this.logger.error(message, {
      ...logContext,
      ...(context && { context }),
      ...(trace && { trace }),
    });
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: string): void {
    const logContext = this.getContext();
    this.logger.warn(message, {
      ...logContext,
      ...(context && { context }),
    });
  }

  /**
   * Log an info message
   */
  log(message: string, context?: string): void {
    const logContext = this.getContext();
    this.logger.info(message, {
      ...logContext,
      ...(context && { context }),
    });
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: string): void {
    const logContext = this.getContext();
    this.logger.debug(message, {
      ...logContext,
      ...(context && { context }),
    });
  }

  /**
   * Log an HTTP request
   */
  http(message: string, meta?: any): void {
    const logContext = this.getContext();
    this.logger.log('http', message, {
      ...logContext,
      ...meta,
    });
  }

  /**
   * Log with custom level and metadata
   */
  logWithMeta(level: string, message: string, meta: any): void {
    const logContext = this.getContext();
    this.logger.log(level, message, {
      ...logContext,
      ...meta,
    });
  }

  /**
   * Log database operations
   */
  logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    error?: Error,
  ): void {
    const logContext = this.getContext();
    const level = success ? 'debug' : 'error';
    const message = `Database ${operation} on ${table} ${success ? 'completed' : 'failed'} in ${duration}ms`;

    this.logger.log(level, message, {
      ...logContext,
      operation,
      table,
      duration,
      success,
      ...(error && { error: error.message, stack: error.stack }),
    });
  }

  /**
   * Log authentication events
   */
  logAuthEvent(
    event: string,
    userId?: string,
    success: boolean = true,
    details?: any,
  ): void {
    const logContext = this.getContext();
    const level = success ? 'info' : 'warn';
    const message = `Authentication event: ${event} ${success ? 'succeeded' : 'failed'}`;

    this.logger.log(level, message, {
      ...logContext,
      event,
      authSuccess: success,
      ...(userId && { targetUserId: userId }),
      ...details,
    });
  }

  /**
   * Log business logic events
   */
  logBusinessEvent(
    event: string,
    entityType: string,
    entityId: string,
    details?: any,
  ): void {
    const logContext = this.getContext();
    const message = `Business event: ${event} for ${entityType}:${entityId}`;

    this.logger.info(message, {
      ...logContext,
      businessEvent: event,
      entityType,
      entityId,
      ...details,
    });
  }

  /**
   * Log external API calls
   */
  logExternalApiCall(
    service: string,
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    success: boolean,
  ): void {
    const logContext = this.getContext();
    const level = success ? 'info' : 'warn';
    const message = `External API call to ${service} ${method} ${endpoint} ${success ? 'succeeded' : 'failed'} (${statusCode}) in ${duration}ms`;

    this.logger.log(level, message, {
      ...logContext,
      externalService: service,
      endpoint,
      method,
      duration,
      statusCode,
      success,
    });
  }

  /**
   * Run a function within a correlation context
   */
  runWithCorrelationId<T>(correlationId: string, fn: () => T): T {
    return this.namespace.runAndReturn(() => {
      this.setCorrelationId(correlationId);
      return fn();
    });
  }

  /**
   * Run a function within a user context
   */
  runWithUserContext<T>(
    userId: string,
    userEmail: string | undefined,
    fn: () => T,
  ): T {
    return this.namespace.runAndReturn(() => {
      this.setUserContext(userId, userEmail);
      return fn();
    });
  }
}
