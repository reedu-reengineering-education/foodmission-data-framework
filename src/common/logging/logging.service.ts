/**
 * OpenTelemetry Native Logging Service
 * 
 * Uses native OpenTelemetry Logs API for cloud-native observability.
 * Provides structured logging with automatic trace correlation.
 */

import { Injectable, LoggerService } from '@nestjs/common';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { trace, context } from '@opentelemetry/api';
import cls from 'cls-hooked';

export interface LogContext {
  traceId?: string;
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
  private readonly logger = logs.getLogger('foodmission-api', '1.0.0');
  private readonly namespace = cls.createNamespace('logging');

  /**
   * Set trace ID for the current request context
   */
  setTraceId(traceId: string): void {
    try {
      this.namespace.set('traceId', traceId);
    } catch {
      // Ignore CLS context errors - they don't affect functionality
    }
  }

  /**
   * Get trace ID from the current request context
   */
  getTraceId(): string | undefined {
    return this.namespace.get('traceId');
  }

  /**
   * Set user context for the current request
   */
  setUserContext(keycloakId: string, userEmail?: string): void {
    try {
      this.namespace.set('userId', keycloakId);
      if (userEmail) {
        this.namespace.set('userEmail', userEmail);
      }
    } catch {
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
    } catch {
      // Ignore CLS context errors - they don't affect functionality
    }
  }

  /**
   * Get the current context for logging
   */
  private getContext(): LogContext {
    const context: LogContext = {};

    const traceId = this.getTraceId();
    if (traceId) context.traceId = traceId;

    const userContext = this.getUserContext();
    if (userContext.userId) context.userId = userContext.userId;
    if (userContext.userEmail) context.userEmail = userContext.userEmail;

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
   * Emit a log record with OpenTelemetry
   */
  private emit(severity: SeverityNumber, message: string, attributes: Record<string, any> = {}): void {
    // Get current trace context from OpenTelemetry
    const span = trace.getSpan(context.active());
    const spanContext = span?.spanContext();

    // Merge context with attributes
    const logContext = this.getContext();
    const allAttributes = {
      ...logContext,
      ...attributes,
    };

    // Add OpenTelemetry trace context if available
    if (spanContext) {
      allAttributes['trace_id'] = spanContext.traceId;
      allAttributes['span_id'] = spanContext.spanId;
      allAttributes['trace_flags'] = spanContext.traceFlags;
    }

    // Emit log record
    this.logger.emit({
      severityNumber: severity,
      severityText: this.getSeverityText(severity),
      body: message,
      attributes: allAttributes,
      timestamp: Date.now(),
    });

    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const consoleMethod = this.getConsoleMethod(severity);
      consoleMethod(`[${this.getSeverityText(severity)}] ${message}`, attributes);
    }
  }

  private getSeverityText(severity: SeverityNumber): string {
    switch (severity) {
      case SeverityNumber.TRACE: return 'TRACE';
      case SeverityNumber.DEBUG: return 'DEBUG';
      case SeverityNumber.INFO: return 'INFO';
      case SeverityNumber.WARN: return 'WARN';
      case SeverityNumber.ERROR: return 'ERROR';
      case SeverityNumber.FATAL: return 'FATAL';
      default: return 'INFO';
    }
  }

  private getConsoleMethod(severity: SeverityNumber): (...args: any[]) => void {
    switch (severity) {
      case SeverityNumber.ERROR:
      case SeverityNumber.FATAL:
        return console.error;
      case SeverityNumber.WARN:
        return console.warn;
      case SeverityNumber.DEBUG:
      case SeverityNumber.TRACE:
        return console.debug;
      default:
        return console.log;
    }
  }

  /**
   * Log an error message
   */
  error(message: string, trace?: string, context?: string): void {
    this.emit(SeverityNumber.ERROR, message, {
      ...(context && { context }),
      ...(trace && { trace }),
    });
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: string): void {
    this.emit(SeverityNumber.WARN, message, {
      ...(context && { context }),
    });
  }

  /**
   * Log an info message
   */
  log(message: string, context?: string): void {
    this.emit(SeverityNumber.INFO, message, {
      ...(context && { context }),
    });
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: string): void {
    this.emit(SeverityNumber.DEBUG, message, {
      ...(context && { context }),
    });
  }

  /**
   * Log an HTTP request
   */
  http(message: string, meta?: any): void {
    this.emit(SeverityNumber.INFO, message, {
      log_type: 'http',
      ...meta,
    });
  }

  /**
   * Log with custom level and metadata
   */
  logWithMeta(level: string, message: string, meta: any): void {
    const severity = this.levelToSeverity(level);
    this.emit(severity, message, meta);
  }

  private levelToSeverity(level: string): SeverityNumber {
    switch (level.toLowerCase()) {
      case 'error': return SeverityNumber.ERROR;
      case 'warn': return SeverityNumber.WARN;
      case 'info': return SeverityNumber.INFO;
      case 'http': return SeverityNumber.INFO;
      case 'debug': return SeverityNumber.DEBUG;
      case 'verbose': return SeverityNumber.TRACE;
      default: return SeverityNumber.INFO;
    }
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
    const severity = success ? SeverityNumber.DEBUG : SeverityNumber.ERROR;
    const message = `Database ${operation} on ${table} ${success ? 'completed' : 'failed'} in ${duration}ms`;

    this.emit(severity, message, {
      operation,
      table,
      duration,
      success,
      log_type: 'database',
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
    const severity = success ? SeverityNumber.INFO : SeverityNumber.WARN;
    const message = `Authentication event: ${event} ${success ? 'succeeded' : 'failed'}`;

    this.emit(severity, message, {
      event,
      authSuccess: success,
      log_type: 'auth',
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
    const message = `Business event: ${event} for ${entityType}:${entityId}`;

    this.emit(SeverityNumber.INFO, message, {
      businessEvent: event,
      entityType,
      entityId,
      log_type: 'business',
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
    const severity = success ? SeverityNumber.INFO : SeverityNumber.WARN;
    const message = `External API call to ${service} ${method} ${endpoint} ${success ? 'succeeded' : 'failed'} (${statusCode}) in ${duration}ms`;

    this.emit(severity, message, {
      externalService: service,
      endpoint,
      method,
      duration,
      statusCode,
      success,
      log_type: 'external_api',
    });
  }

  /**
   * Run a function within a trace context
   */
  runWithTraceId<T>(traceId: string, fn: () => T): T {
    return this.namespace.runAndReturn(() => {
      this.setTraceId(traceId);
      return fn();
    });
  }

  /**
   * Run a function within a user context
   */
  runWithUserContext<T>(
    keycloakId: string,
    userEmail: string | undefined,
    fn: () => T,
  ): T {
    return this.namespace.runAndReturn(() => {
      this.setUserContext(keycloakId, userEmail);
      return fn();
    });
  }
}
