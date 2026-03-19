/**
 * Winston Logger Configuration
 *
 * This module provides Winston logger configuration for the application.
 * It supports multiple transports (console, file) and integrates with OpenTelemetry
 * for distributed tracing and log trace ID tracking.
 *
 * Features:
 * - Environment-based log levels
 * - Console and file transports with rotation
 * - Structured JSON logging for production
 * - Pretty-printed logs for development
 * - Automatic OpenTelemetry integration
 */

import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

export interface LoggerConfig {
  level: string;
  enableConsole: boolean;
  enableFile: boolean;
  logDir: string;
  maxFiles: string;
  maxSize: string;
  format: winston.Logform.Format;
  enableOtel: boolean;
  otelEndpoint?: string;
  otelHeaders?: string;
}

/**
 * Custom format to restructure log fields (keeps logs as objects, not strings)
 */
const customFormat = winston.format((info) => {
  // Rename traceId to trace_id for consistency
  if (info.traceId) {
    info.trace_id = info.traceId;
    delete info.traceId;
  }
  
  // Return the modified info object
  return info;
});

/**
 * Create logger configuration from environment variables
 */
export const createLoggerConfig = (): LoggerConfig => ({
  level: process.env.LOG_LEVEL || 'info',
  enableConsole: process.env.LOG_CONSOLE !== 'false',
  enableFile: process.env.LOG_FILE !== 'false',
  logDir: process.env.LOG_DIR || './logs',
  maxFiles: process.env.LOG_MAX_FILES || '14d',
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    customFormat(),
    winston.format.json(),
  ),
  // OpenTelemetry config
  enableOtel: process.env.OTEL_LOGS_ENABLED === 'true',
  otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  otelHeaders: process.env.OTEL_EXPORTER_OTLP_HEADERS,
});

/**
 * Create Winston logger instance with configured transports
 */
export const createWinstonLogger = (config: LoggerConfig): winston.Logger => {
  const transports: winston.transport[] = [];

  // Console transport with pretty formatting for development
  if (config.enableConsole) {
    transports.push(
      new winston.transports.Console({
        level: config.level,
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('FOODMISSION', {
            colors: true,
            prettyPrint: true,
            processId: true,
            appName: true,
          }),
        ),
      }),
    );
  }

  // File transports with daily rotation
  if (config.enableFile) {
    // General application logs
    transports.push(
      new DailyRotateFile({
        filename: `${config.logDir}/application-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxFiles: config.maxFiles,
        maxSize: config.maxSize,
        level: config.level,
        format: config.format,
        auditFile: `${config.logDir}/.application-audit.json`,
      }),
    );

    // Error logs (separate file for easier debugging)
    transports.push(
      new DailyRotateFile({
        filename: `${config.logDir}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxFiles: config.maxFiles,
        maxSize: config.maxSize,
        level: 'error',
        format: config.format,
        auditFile: `${config.logDir}/.error-audit.json`,
      }),
    );

    // HTTP request logs (for API monitoring)
    transports.push(
      new DailyRotateFile({
        filename: `${config.logDir}/http-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxFiles: config.maxFiles,
        maxSize: config.maxSize,
        level: 'http',
        format: config.format,
        auditFile: `${config.logDir}/.http-audit.json`,
      }),
    );
  }

  // Note: OpenTelemetry Winston instrumentation is automatically applied
  // by the NodeSDK in otel-logging.bootstrap.ts when OTEL_LOGS_ENABLED=true

  return winston.createLogger({
    level: config.level,
    format: config.format,
    transports,
    exitOnError: false,
    defaultMeta: {
      service: process.env.OTEL_SERVICE_NAME || 'foodmission-api',
      environment: process.env.NODE_ENV || 'development',
    },
  });
};

/**
 * Custom log levels for Winston
 * Follows RFC 5424 syslog severity levels
 */
export const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  },
};
