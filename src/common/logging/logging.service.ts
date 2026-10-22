/**
 * The application's single logger.
 *
 * Extends Nest's ConsoleLogger and is registered with `app.useLogger()`, so
 * every `new Logger(Context)` call, the static `Logger` and Nest's own
 * framework messages end up here. Each entry is printed to stdout by
 * ConsoleLogger and also emitted as an OpenTelemetry log record (shipped to
 * Loki when OTEL_LOGS_ENABLED=true), with trace correlation.
 *
 * Levels are filtered once, by LOG_LEVEL (see log-level.ts).
 */

import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { trace, context as otelContext } from '@opentelemetry/api';
import cls from 'cls-hooked';
import { nestLogLevels } from './log-level';
import { redact } from './redact';

export interface LogContext {
  traceId?: string;
  userId?: string;
  requestId?: string;
  method?: string;
  url?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

const SEVERITY_BY_LEVEL: Record<LogLevel, SeverityNumber> = {
  verbose: SeverityNumber.TRACE,
  debug: SeverityNumber.DEBUG,
  log: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
  fatal: SeverityNumber.FATAL,
};

@Injectable()
export class LoggingService extends ConsoleLogger {
  private readonly otelLogger = logs.getLogger('foodmission-api', '1.0.0');
  private readonly namespace = cls.createNamespace('logging');

  constructor() {
    // Colors stay on (Nest default); set NO_COLOR=1 to turn them off.
    super({ logLevels: nestLogLevels() });
  }

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
  setUserContext(keycloakId: string): void {
    try {
      this.namespace.set('userId', keycloakId);
    } catch {
      // Ignore CLS context errors - they don't affect functionality
    }
  }

  /**
   * Get user context from the current request
   */
  getUserContext(): { userId?: string } {
    return {
      userId: this.namespace.get('userId'),
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
   * Every Nest log call (instance or static Logger) ends here once its level
   * passed the LOG_LEVEL filter: print to stdout, then emit to OpenTelemetry.
   */
  protected printMessages(
    messages: unknown[],
    context = '',
    logLevel: LogLevel = 'log',
    writeStreamType?: 'stdout' | 'stderr',
    errorStack?: unknown,
  ): void {
    // Objects passed to a logger (e.g. by libraries) may carry tokens or passwords
    messages = messages.map(redact);
    super.printMessages(
      messages,
      context,
      logLevel,
      writeStreamType,
      errorStack,
    );

    for (const message of messages) {
      const stack =
        typeof errorStack === 'string'
          ? errorStack
          : message instanceof Error
            ? message.stack
            : undefined;
      this.emit(SEVERITY_BY_LEVEL[logLevel], this.toText(message), {
        ...(context && { context }),
        ...(stack && { trace: stack }),
      });
    }
  }

  /**
   * Print and emit one entry with structured attributes. Used by the helpers
   * below; calls super.printMessages directly so the record isn't emitted twice.
   */
  private write(
    level: LogLevel,
    message: string,
    attributes: Record<string, any>,
    context?: string,
    stack?: string,
  ): void {
    if (!this.isLevelEnabled(level)) {
      return;
    }
    super.printMessages(
      [message],
      context,
      level,
      level === 'error' || level === 'fatal' ? 'stderr' : 'stdout',
    );
    if (stack) {
      this.printStackTrace(stack);
    }
    this.emit(SEVERITY_BY_LEVEL[level], message, {
      ...(context && { context }),
      ...(redact(attributes) as Record<string, any>),
    });
  }

  private toText(message: unknown): string {
    if (typeof message === 'string') return message;
    if (message instanceof Error) return message.message;
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  /**
   * Emit a log record with OpenTelemetry (no-op when OTel logging is disabled)
   */
  private emit(
    severity: SeverityNumber,
    message: string,
    attributes: Record<string, any> = {},
  ): void {
    // Get current trace context from OpenTelemetry
    const span = trace.getSpan(otelContext.active());
    const spanContext = span?.spanContext();

    // Merge context with attributes
    const logContext = this.getContext();

    // Convert camelCase context to snake_case for OpenTelemetry attributes
    const allAttributes: Record<string, any> = {};

    // Add context with snake_case naming
    if (logContext.traceId) allAttributes['trace_id'] = logContext.traceId;
    if (logContext.userId) allAttributes['user_id'] = logContext.userId;
    if (logContext.requestId)
      allAttributes['request_id'] = logContext.requestId;
    if (logContext.method) allAttributes['method'] = logContext.method;
    if (logContext.url) allAttributes['url'] = logContext.url;
    if (logContext.userAgent)
      allAttributes['user_agent'] = logContext.userAgent;
    if (logContext.ip) allAttributes['ip'] = logContext.ip;

    // Add custom attributes (convert camelCase keys to snake_case)
    Object.keys(attributes).forEach((key) => {
      const snakeKey = this.toSnakeCase(key);
      allAttributes[snakeKey] = attributes[key];
    });

    // Add OpenTelemetry trace context if available (may override trace_id from context)
    if (spanContext) {
      allAttributes['trace_id'] = spanContext.traceId;
      allAttributes['span_id'] = spanContext.spanId;
      allAttributes['trace_flags'] = spanContext.traceFlags;
    }

    this.otelLogger.emit({
      severityNumber: severity,
      severityText: this.getSeverityText(severity),
      body: message,
      attributes: allAttributes,
      timestamp: Date.now(),
    });
  }

  /**
   * Convert camelCase to snake_case
   */
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  private getSeverityText(severity: SeverityNumber): string {
    switch (severity) {
      case SeverityNumber.TRACE:
        return 'TRACE';
      case SeverityNumber.DEBUG:
        return 'DEBUG';
      case SeverityNumber.INFO:
        return 'INFO';
      case SeverityNumber.WARN:
        return 'WARN';
      case SeverityNumber.ERROR:
        return 'ERROR';
      case SeverityNumber.FATAL:
        return 'FATAL';
      default:
        return 'INFO';
    }
  }

  /**
   * Log an HTTP request
   */
  http(message: string, meta?: any): void {
    this.write('log', message, { log_type: 'http', ...meta }, 'HTTP');
  }

  /**
   * Log with custom level and metadata
   */
  logWithMeta(level: string, message: string, meta: any): void {
    this.write(this.toNestLevel(level), message, meta ?? {}, meta?.context);
  }

  private toNestLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'fatal':
        return 'fatal';
      case 'error':
        return 'error';
      case 'warn':
        return 'warn';
      case 'debug':
        return 'debug';
      case 'verbose':
        return 'verbose';
      default:
        // 'info', 'http' and anything unknown
        return 'log';
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
    const message = `Database ${operation} on ${table} ${success ? 'completed' : 'failed'} in ${duration}ms`;

    this.write(
      success ? 'debug' : 'error',
      message,
      {
        operation,
        table,
        duration,
        success,
        log_type: 'database',
        ...(error && { error: error.message, stack: error.stack }),
      },
      'Database',
      error?.stack,
    );
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
    const message = `Authentication event: ${event} ${success ? 'succeeded' : 'failed'}`;

    this.write(
      success ? 'log' : 'warn',
      message,
      {
        event,
        authSuccess: success,
        log_type: 'auth',
        ...(userId && { targetUserId: userId }),
        ...details,
      },
      'Auth',
    );
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

    this.write(
      'log',
      message,
      {
        businessEvent: event,
        entityType,
        entityId,
        log_type: 'business',
        ...details,
      },
      'Business',
    );
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
    const message = `External API call to ${service} ${method} ${endpoint} ${success ? 'succeeded' : 'failed'} (${statusCode}) in ${duration}ms`;

    this.write(
      success ? 'log' : 'warn',
      message,
      {
        externalService: service,
        endpoint,
        method,
        duration,
        statusCode,
        success,
        log_type: 'external_api',
      },
      'ExternalApi',
    );
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
  runWithUserContext<T>(keycloakId: string, fn: () => T): T {
    return this.namespace.runAndReturn(() => {
      this.setUserContext(keycloakId);
      return fn();
    });
  }
}
